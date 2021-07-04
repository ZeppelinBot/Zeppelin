import { Client, Intents, TextChannel } from "discord.js";
import fs from "fs";
import yaml from "js-yaml";
import { Knub, PluginError } from "knub";
import { PluginLoadError } from "knub/dist/plugins/PluginLoadError";
// Always use UTC internally
// This is also enforced for the database in data/db.ts
import moment from "moment-timezone";
import { AllowedGuilds } from "./data/AllowedGuilds";
import { Configs } from "./data/Configs";
import { connect } from "./data/db";
import { GuildLogs } from "./data/GuildLogs";
import { LogType } from "./data/LogType";
import { ErisError } from "./ErisError";
import "./loadEnv";
import { logger } from "./logger";
import { baseGuildPlugins, globalPlugins, guildPlugins } from "./plugins/availablePlugins";
import { RecoverablePluginError } from "./RecoverablePluginError";
import { SimpleError } from "./SimpleError";
import { ZeppelinGlobalConfig, ZeppelinGuildConfig } from "./types";
import { startUptimeCounter } from "./uptime";
import { errorMessage, isDiscordHTTPError, isDiscordAPIError, successMessage } from "./utils";

const fsp = fs.promises;

if (!process.env.KEY) {
  // tslint:disable-next-line:no-console
  console.error("Project root .env with KEY is required!");
  process.exit(1);
}

declare global {
  // This is here so TypeScript doesn't give an error when importing twemoji
  // since one of the signatures of twemoji.parse() takes an HTMLElement but
  // we're not in a browser environment so including the DOM lib would not make
  // sense
  type HTMLElement = unknown;
}

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
  const guildName = err.guild?.name || "Global";
  const guildId = err.guild?.id || "0";

  if (err instanceof RecoverablePluginError) {
    // Recoverable plugin errors can be, well, recovered from.
    // Log it in the console as a warning and post a warning to the guild's log.

    // tslint:disable:no-console
    console.warn(`${guildName}: [${err.code}] ${err.message}`);

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

  if (err instanceof ErisError) {
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
const REQUIRED_NODE_VERSION = "14.0.0";
const requiredParts = REQUIRED_NODE_VERSION.split(".").map(v => parseInt(v, 10));
const actualVersionParts = process.versions.node.split(".").map(v => parseInt(v, 10));
for (const [i, part] of actualVersionParts.entries()) {
  if (part > requiredParts[i]) break;
  if (part === requiredParts[i]) continue;
  throw new SimpleError(`Unsupported Node.js version! Must be at least ${REQUIRED_NODE_VERSION}`);
}

moment.tz.setDefault("UTC");

logger.info("Connecting to database");
connect().then(async () => {
  const client = new Client({
    partials: ["USER", "CHANNEL", "GUILD_MEMBER", "MESSAGE", "REACTION"],
    restTimeOffset: 150,
    restGlobalRateLimit: 50,
    // Disable mentions by default
    allowedMentions: {
      parse: [],
      users: [],
      roles: [],
      repliedUser: false,
    },
    intents: [
      // Privileged
      Intents.FLAGS.GUILD_MEMBERS,
      // Intents.FLAGS.GUILD_PRESENCES,
      Intents.FLAGS.GUILD_MESSAGE_TYPING,

      // Regular
      Intents.FLAGS.DIRECT_MESSAGES,
      Intents.FLAGS.GUILD_BANS,
      Intents.FLAGS.GUILD_EMOJIS,
      Intents.FLAGS.GUILD_INVITES,
      Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_VOICE_STATES,
    ],
  });
  client.setMaxListeners(200);

  client.on("debug", message => {
    if (message.includes(" 429 ")) {
      logger.info(`[429] ${message}`);
    }
  });

  client.on("error", err => {
    errorHandler(new ErisError(err.message, (err as any).code, 0));
  });

  const allowedGuilds = new AllowedGuilds();
  const guildConfigs = new Configs();

  const bot = new Knub<ZeppelinGuildConfig, ZeppelinGlobalConfig>(client, {
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
        const basePluginNames = baseGuildPlugins.map(p => p.name);

        return Array.from(plugins.keys()).filter(pluginName => {
          if (basePluginNames.includes(pluginName)) return true;
          return configuredPlugins[pluginName] && configuredPlugins[pluginName].enabled !== false;
        });
      },

      async getConfig(id) {
        const key = id === "global" ? "global" : `guild-${id}`;
        const row = await guildConfigs.getActiveByKey(key);
        if (row) {
          return yaml.safeLoad(row.config);
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
        const guildId = channel instanceof TextChannel ? channel.guild.id : undefined;
        const emoji = guildId ? bot.getLoadedGuild(guildId)!.config.success_emoji : undefined;
        channel.send(successMessage(body, emoji));
      },

      sendErrorMessageFn(channel, body) {
        const guildId = channel instanceof TextChannel ? channel.guild.id : undefined;
        const emoji = guildId ? bot.getLoadedGuild(guildId)!.config.error_emoji : undefined;
        channel.send(errorMessage(body, emoji));
      },
    },
  });

  client.once("ready", () => {
    startUptimeCounter();
  });

  bot.initialize();
  logger.info("Bot Initialized");
  logger.info("Logging in...");
  await client.login(process.env.token);
});
