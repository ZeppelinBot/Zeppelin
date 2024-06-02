// KEEP THIS AS FIRST IMPORT
// See comment in module for details
import "./threadsSignalFix.js";

import {
  Client,
  Events,
  GatewayIntentBits,
  Options,
  Partials,
  RESTEvents,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { EventEmitter } from "events";
import { Knub, PluginError, PluginLoadError, PluginNotLoadedError } from "knub";
import moment from "moment-timezone";
import { performance } from "perf_hooks";
import process from "process";
import { DiscordJSError } from "./DiscordJSError.js";
import { RecoverablePluginError } from "./RecoverablePluginError.js";
import { SimpleError } from "./SimpleError.js";
import { AllowedGuilds } from "./data/AllowedGuilds.js";
import { Configs } from "./data/Configs.js";
import { GuildLogs } from "./data/GuildLogs.js";
import { LogType } from "./data/LogType.js";
import { hasPhishermanMasterAPIKey } from "./data/Phisherman.js";
import { dataSource } from "./data/dataSource.js";
import { connect } from "./data/db.js";
import { runExpiredArchiveDeletionLoop } from "./data/loops/expiredArchiveDeletionLoop.js";
import { runExpiredMemberCacheDeletionLoop } from "./data/loops/expiredMemberCacheDeletionLoop.js";
import { runExpiringMutesLoop } from "./data/loops/expiringMutesLoop.js";
import { runExpiringTempbansLoop } from "./data/loops/expiringTempbansLoop.js";
import { runExpiringVCAlertsLoop } from "./data/loops/expiringVCAlertsLoop.js";
import { runMemberCacheDeletionLoop } from "./data/loops/memberCacheDeletionLoop.js";
import { runPhishermanCacheCleanupLoop, runPhishermanReportingLoop } from "./data/loops/phishermanLoops.js";
import { runSavedMessageCleanupLoop } from "./data/loops/savedMessageCleanupLoop.js";
import { runUpcomingRemindersLoop } from "./data/loops/upcomingRemindersLoop.js";
import { runUpcomingScheduledPostsLoop } from "./data/loops/upcomingScheduledPostsLoop.js";
import { consumeQueryStats } from "./data/queryLogger.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { baseGuildPlugins, globalPlugins, guildPlugins } from "./plugins/availablePlugins.js";
import { setProfiler } from "./profiler.js";
import { logRateLimit } from "./rateLimitStats.js";
import { startUptimeCounter } from "./uptime.js";
import {
  MINUTES,
  SECONDS,
  errorMessage,
  isDiscordAPIError,
  isDiscordHTTPError,
  sleep,
  successMessage,
} from "./utils.js";
import { DecayingCounter } from "./utils/DecayingCounter.js";
import { enableProfiling } from "./utils/easyProfiler.js";
import { loadYamlSafely } from "./utils/loadYamlSafely.js";

// Error handling
let recentPluginErrors = 0;
const RECENT_PLUGIN_ERROR_EXIT_THRESHOLD = 5;

let recentDiscordErrors = 0;
const RECENT_DISCORD_ERROR_EXIT_THRESHOLD = 5;

setInterval(() => (recentPluginErrors = Math.max(0, recentPluginErrors - 1)), 2000);
setInterval(() => (recentDiscordErrors = Math.max(0, recentDiscordErrors - 1)), 2000);

// Eris handles these internally, so we don't need to panic if we get one of them
const SAFE_TO_IGNORE_ERIS_ERROR_CODES = [
  1001, // "CloudFlare WebSocket proxy restarting"
  1006, // "Connection reset by peer"
  "ECONNRESET", // Pretty much the same as above
];

const SAFE_TO_IGNORE_ERIS_ERROR_MESSAGES = ["Server didn't acknowledge previous heartbeat, possible lost connection"];

function errorHandler(err) {
  const guildId = err.guild?.id || err.guildId || "0";
  const guildName = err.guild?.name || (guildId && guildId !== "0" ? "Unknown" : "Global");

  if (err instanceof RecoverablePluginError) {
    // Recoverable plugin errors can be, well, recovered from.
    // Log it in the console as a warning and post a warning to the guild's log.

    // tslint:disable:no-console
    console.warn(`${guildId} ${guildName}: [${err.code}] ${err.message}`);

    if (err.guild) {
      const logs = new GuildLogs(err.guild.id);
      logs.log(LogType.BOT_ALERT, { body: `\`[${err.code}]\` ${err.message}` });
    }

    return;
  }

  if (err instanceof PluginLoadError) {
    // tslint:disable:no-console
    console.warn(`${guildName} (${guildId}): Failed to load plugin '${err.pluginName}': ${err.message}`);
    return;
  }

  if (err instanceof DiscordJSError) {
    if (err.code && SAFE_TO_IGNORE_ERIS_ERROR_CODES.includes(err.code)) {
      return;
    }

    if (err.message && SAFE_TO_IGNORE_ERIS_ERROR_MESSAGES.includes(err.message)) {
      return;
    }
  }

  if (isDiscordHTTPError(err) && err.code >= 500) {
    // Don't need stack traces on HTTP 500 errors
    // These also shouldn't count towards RECENT_DISCORD_ERROR_EXIT_THRESHOLD because they don't indicate an error in our code
    console.error(err.message);
    return;
  }

  if (err.message && err.message.startsWith("Request timed out")) {
    // These are very noisy, so just print the message without stack. The stack trace doesn't really help here anyway.
    console.error(err.message);
    return;
  }

  // FIXME: Hotfix
  if (err.message && err.message.startsWith("Unknown custom override criteria")) {
    // console.warn(err.message);
    return;
  }

  // FIXME: Hotfix
  if (err.message && err.message.startsWith("Unknown override criteria")) {
    // console.warn(err.message);
    return;
  }

  if (err instanceof PluginNotLoadedError) {
    // We don't want to crash the bot here, although this *should not happen*
    // TODO: Proper system for preventing plugin load/unload race conditions
    console.error(err);
    return;
  }

  // tslint:disable:no-console
  console.error(err);

  if (err instanceof PluginError) {
    // Tolerate a few recent plugin errors before crashing
    if (++recentPluginErrors >= RECENT_PLUGIN_ERROR_EXIT_THRESHOLD) {
      console.error(`Exiting after ${RECENT_PLUGIN_ERROR_EXIT_THRESHOLD} plugin errors`);
      process.exit(1);
    }
  } else if (isDiscordAPIError(err) || isDiscordHTTPError(err)) {
    // Discord API errors, usually safe to just log instead of crash
    // We still bail if we get a ton of them in a short amount of time
    if (++recentDiscordErrors >= RECENT_DISCORD_ERROR_EXIT_THRESHOLD) {
      console.error(`Exiting after ${RECENT_DISCORD_ERROR_EXIT_THRESHOLD} API errors`);
      process.exit(1);
    }
  } else {
    // On other errors, crash immediately
    process.exit(1);
  }
  // tslint:enable:no-console
}

if (process.env.NODE_ENV === "production") {
  process.on("uncaughtException", errorHandler);
  process.on("unhandledRejection", errorHandler);
}

// Verify required Node.js version
const REQUIRED_NODE_VERSION = "16.9.0";
const requiredParts = REQUIRED_NODE_VERSION.split(".").map((v) => parseInt(v, 10));
const actualVersionParts = process.versions.node.split(".").map((v) => parseInt(v, 10));
for (const [i, part] of actualVersionParts.entries()) {
  if (part > requiredParts[i]) break;
  if (part === requiredParts[i]) continue;
  throw new SimpleError(`Unsupported Node.js version! Must be at least ${REQUIRED_NODE_VERSION}`);
}

// Always use UTC internally
// This is also enforced for the database in data/db.ts
moment.tz.setDefault("UTC");

// Blocking check
let avgTotal = 0;
let avgCount = 0;
let lastCheck = performance.now();
setInterval(() => {
  const now = performance.now();
  let diff = Math.max(0, now - lastCheck);
  if (diff < 5) diff = 0;
  avgTotal += diff;
  avgCount++;
  lastCheck = now;
}, 500);
setInterval(() => {
  const avgBlocking = avgTotal / (avgCount || 1);
  // FIXME: Debug
  // tslint:disable-next-line:no-console
  console.log(`Average blocking in the last 5min: ${avgBlocking / avgTotal}ms`);
  avgTotal = 0;
  avgCount = 0;
}, 5 * 60 * 1000);

if (env.DEBUG) {
  logger.info("NOTE: Bot started in DEBUG mode");
}

logger.info("Connecting to database");
connect().then(async () => {
  const client = new Client({
    partials: [Partials.User, Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction],

    makeCache: Options.cacheWithLimits({
      ...Options.DefaultMakeCacheSettings,
      MessageManager: 1,
      // GuildMemberManager: 15000,
      GuildInviteManager: 0,
    }),

    rest: {
      // globalRequestsPerSecond: 50,
      // offset: 1000,
    },

    // Disable mentions by default
    allowedMentions: {
      parse: [],
      users: [],
      roles: [],
      repliedUser: false,
    },
    intents: [
      // Privileged
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
      // GatewayIntentBits.GuildPresences,

      // Regular
      GatewayIntentBits.GuildMessageTyping,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildEmojisAndStickers,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });
  // FIXME: TS doesn't see Client as a child of EventEmitter for some reason
  (client as unknown as EventEmitter).setMaxListeners(200);

  const safe429DecayInterval = 5 * SECONDS;
  const safe429MaxCount = 5;
  const safe429Counter = new DecayingCounter(safe429DecayInterval);
  client.on(Events.Debug, (errorText) => {
    if (!errorText.includes("429")) {
      return;
    }

    // tslint:disable-next-line:no-console
    console.warn(`[DEBUG] [WARN] [429] ${errorText}`);

    const value = safe429Counter.add(1);
    if (value > safe429MaxCount) {
      // tslint:disable-next-line:no-console
      console.error(`Too many 429s (over ${safe429MaxCount} in ${safe429MaxCount * safe429DecayInterval}ms), exiting`);
      process.exit(1);
    }
  });

  client.on("error", (err) => {
    errorHandler(new DiscordJSError(err.message, (err as any).code, 0));
  });

  const allowedGuilds = new AllowedGuilds();
  const guildConfigs = new Configs();

  const bot = new Knub(client, {
    guildPlugins,
    globalPlugins,

    options: {
      canLoadGuild(guildId): Promise<boolean> {
        return allowedGuilds.isAllowed(guildId);
      },

      /**
       * Plugins are enabled if they...
       * - are base plugins, i.e. always enabled, or
       * - are explicitly enabled in the guild config
       * Dependencies are also automatically loaded by Knub.
       */
      async getEnabledGuildPlugins(ctx, plugins): Promise<string[]> {
        if (!ctx.config || !ctx.config.plugins) {
          return [];
        }

        const configuredPlugins = ctx.config.plugins;
        const basePluginNames = baseGuildPlugins.map((p) => p.name);

        return Array.from(plugins.keys()).filter((pluginName) => {
          if (basePluginNames.includes(pluginName)) return true;
          return configuredPlugins[pluginName] && (configuredPlugins[pluginName] as any).enabled !== false;
        });
      },

      async getConfig(id) {
        const key = id === "global" ? "global" : `guild-${id}`;
        if (id !== "global") {
          const allowedGuild = await allowedGuilds.find(id);
          if (!allowedGuild) {
            return {};
          }
        }

        const row = await guildConfigs.getActiveByKey(key);
        if (row) {
          try {
            const loaded = loadYamlSafely(row.config);
            // Remove deprecated properties some may still have in their config
            delete loaded.success_emoji;
            delete loaded.error_emoji;
            return loaded;
          } catch (err) {
            logger.error(`Error while loading config "${key}": ${err.message}`);
            return {};
          }
        }

        logger.warn(`No config with key "${key}"`);
        return {};
      },

      logFn: (level, msg) => {
        if (level === "debug") return;

        if (logger[level]) {
          logger[level](msg);
        } else {
          logger.log(`[${level.toUpperCase()}] ${msg}`);
        }
      },

      performanceDebug: {
        enabled: false,
        size: 30,
        threshold: 200,
      },

      sendSuccessMessageFn(channel, body) {
        const guildId =
          channel instanceof TextChannel || channel instanceof ThreadChannel ? channel.guild.id : undefined;
        // @ts-expect-error
        const emoji = guildId ? bot.getLoadedGuild(guildId)!.config.success_emoji : undefined;
        channel.send(successMessage(body, emoji));
      },

      sendErrorMessageFn(channel, body) {
        const guildId =
          channel instanceof TextChannel || channel instanceof ThreadChannel ? channel.guild.id : undefined;
        // @ts-expect-error
        const emoji = guildId ? bot.getLoadedGuild(guildId)!.config.error_emoji : undefined;
        channel.send(errorMessage(body, emoji));
      },
    },
  });

  client.once("ready", () => {
    startUptimeCounter();
  });

  client.rest.on(RESTEvents.RateLimited, (data) => {
    logRateLimit(data);
  });

  bot.on("loadingFinished", async () => {
    setProfiler(bot.profiler);
    if (process.env.PROFILING === "true") {
      enableProfiling();
    }

    runExpiringMutesLoop();
    await sleep(10 * SECONDS);
    runExpiringTempbansLoop();
    await sleep(10 * SECONDS);
    runUpcomingScheduledPostsLoop();
    await sleep(10 * SECONDS);
    runUpcomingRemindersLoop();
    await sleep(10 * SECONDS);
    runExpiringVCAlertsLoop();
    await sleep(10 * SECONDS);
    runExpiredArchiveDeletionLoop();
    await sleep(10 * SECONDS);
    runSavedMessageCleanupLoop();
    await sleep(10 * SECONDS);
    runExpiredMemberCacheDeletionLoop();
    await sleep(10 * SECONDS);
    runMemberCacheDeletionLoop();

    if (hasPhishermanMasterAPIKey()) {
      await sleep(10 * SECONDS);
      runPhishermanCacheCleanupLoop();
      await sleep(10 * SECONDS);
      runPhishermanReportingLoop();
    }
  });

  let lowestGlobalRemaining = Infinity;
  setInterval(() => {
    lowestGlobalRemaining = Math.min(lowestGlobalRemaining, (client as any).rest.globalRemaining);
  }, 100);
  setInterval(() => {
    // FIXME: Debug
    if (lowestGlobalRemaining < 30) {
      // tslint:disable-next-line:no-console
      console.log("[DEBUG] Lowest global remaining in the past 15 seconds:", lowestGlobalRemaining);
    }
    lowestGlobalRemaining = Infinity;
  }, 15000);

  setInterval(() => {
    const queryStatsMap = consumeQueryStats();
    const entries = Array.from(queryStatsMap.entries());
    entries.sort((a, b) => b[1] - a[1]);
    const topEntriesStr = entries
      .slice(0, 5)
      .map(([key, count]) => `${count}x ${key}`)
      .join("\n");
    // FIXME: Debug
    // tslint:disable-next-line:no-console
    console.log(`Top query entries in the past 5 minutes:\n${topEntriesStr}`);
  }, 5 * MINUTES);

  bot.initialize();
  logger.info("Bot Initialized");
  logger.info("Logging in...");
  await client.login(env.BOT_TOKEN);

  // Don't intercept any signals in DEBUG mode: https://github.com/clinicjs/node-clinic/issues/444#issuecomment-1474997090
  if (!env.DEBUG) {
    let stopping = false;
    const cleanupAndStop = async (code) => {
      if (stopping) {
        return;
      }
      stopping = true;
      logger.info("Cleaning up before exit...");
      // Force exit after 10sec
      setTimeout(() => process.exit(code), 10 * SECONDS);
      await bot.destroy();
      await dataSource.destroy();
      logger.info("Done! Exiting now.");
      process.exit(code);
    };
    process.on("beforeExit", () => cleanupAndStop(0));
    process.on("SIGINT", () => {
      logger.info("Received SIGINT, exiting...");
      cleanupAndStop(0);
    });
    process.on("SIGTERM", () => {
      logger.info("Received SIGTERM, exiting...");
      cleanupAndStop(0);
    });
  }
});
