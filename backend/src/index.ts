import path from "path";
import yaml from "js-yaml";

import fs from "fs";
const fsp = fs.promises;

import { Knub, logger, PluginError, Plugin, IGlobalConfig, IGuildConfig } from "knub";
import { SimpleError } from "./SimpleError";

import { Configs } from "./data/Configs";

require("dotenv").config({ path: path.resolve(process.cwd(), "bot.env") });

// Error handling
let recentPluginErrors = 0;
const RECENT_PLUGIN_ERROR_EXIT_THRESHOLD = 5;

let recentDiscordErrors = 0;
const RECENT_DISCORD_ERROR_EXIT_THRESHOLD = 5;

setInterval(() => (recentPluginErrors = Math.max(0, recentPluginErrors - 1)), 2500);
setInterval(() => (recentDiscordErrors = Math.max(0, recentDiscordErrors - 1)), 2500);

if (process.env.NODE_ENV === "production") {
  const errorHandler = err => {
    if (err instanceof RecoverablePluginError) {
      // Recoverable plugin errors can be, well, recovered from.
      // Log it in the console as a warning and post a warning to the guild's log.

      // tslint:disable:no-console
      console.warn(`${err.guild.name}: [${err.code}] ${err.message}`);

      const logs = new GuildLogs(err.guild.id);
      logs.log(LogType.BOT_ALERT, { body: `\`[${err.code}]\` ${err.message}` });

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
    } else if (isDiscordRESTError(err) || isDiscordHTTPError(err)) {
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
  };

  process.on("uncaughtException", errorHandler);
}

// Verify required Node.js version
const REQUIRED_NODE_VERSION = "10.14.2";
const requiredParts = REQUIRED_NODE_VERSION.split(".").map(v => parseInt(v, 10));
const actualVersionParts = process.versions.node.split(".").map(v => parseInt(v, 10));
for (const [i, part] of actualVersionParts.entries()) {
  if (part > requiredParts[i]) break;
  if (part === requiredParts[i]) continue;
  throw new SimpleError(`Unsupported Node.js version! Must be at least ${REQUIRED_NODE_VERSION}`);
}

// Always use UTC internally
// This is also enforced for the database in data/db.ts
import moment from "moment-timezone";
moment.tz.setDefault("UTC");

import { Client, TextChannel } from "eris";
import { connect } from "./data/db";
import { availablePlugins, availableGlobalPlugins, basePlugins } from "./plugins/availablePlugins";
import { ZeppelinPluginClass } from "./plugins/ZeppelinPluginClass";
import { customArgumentTypes } from "./customArgumentTypes";
import { errorMessage, isDiscordHTTPError, isDiscordRESTError, successMessage } from "./utils";
import { startUptimeCounter } from "./uptime";
import { AllowedGuilds } from "./data/AllowedGuilds";
import { IZeppelinGuildConfig, IZeppelinGlobalConfig } from "./types";
import { RecoverablePluginError } from "./RecoverablePluginError";
import { GuildLogs } from "./data/GuildLogs";
import { LogType } from "./data/LogType";

logger.info("Connecting to database");
connect().then(async () => {
  const client = new Client(`Bot ${process.env.TOKEN}`, {
    getAllUsers: false,
    restMode: true,
  });
  client.setMaxListeners(100);

  client.on("debug", message => {
    if (message.includes(" 429 ")) {
      logger.info(`[429] ${message}`);
    }
  });

  const allowedGuilds = new AllowedGuilds();
  const guildConfigs = new Configs();

  const bot = new Knub<IZeppelinGuildConfig, IZeppelinGlobalConfig>(client, {
    guildPlugins: availablePlugins,
    globalPlugins: availableGlobalPlugins,

    options: {
      canLoadGuild(guildId): Promise<boolean> {
        return allowedGuilds.isAllowed(guildId);
      },

      /**
       * Plugins are enabled if they...
       * - are base plugins, i.e. always enabled, or
       * - are dependencies of other enabled plugins, or
       * - are explicitly enabled in the guild config
       */
      async getEnabledPlugins(guildId, guildConfig): Promise<string[]> {
        const configuredPlugins = guildConfig.plugins || {};
        const pluginNames: string[] = Array.from(this.plugins.keys());
        const plugins: Array<typeof Plugin> = Array.from(this.plugins.values());
        const zeppelinPlugins: Array<typeof ZeppelinPluginClass> = plugins.filter(
          p => p.prototype instanceof ZeppelinPluginClass,
        ) as Array<typeof ZeppelinPluginClass>;

        const enabledBasePlugins = pluginNames.filter(n => basePlugins.includes(n));
        const explicitlyEnabledPlugins = pluginNames.filter(pluginName => {
          return configuredPlugins[pluginName] && configuredPlugins[pluginName].enabled !== false;
        });
        const enabledPlugins = new Set([...enabledBasePlugins, ...explicitlyEnabledPlugins]);

        const pluginsEnabledAsDependencies = zeppelinPlugins.reduce((arr, pluginClass) => {
          if (!enabledPlugins.has(pluginClass.pluginName)) return arr;
          return arr.concat(pluginClass.dependencies);
        }, []);

        const finalEnabledPlugins = new Set([
          ...basePlugins,
          ...pluginsEnabledAsDependencies,
          ...explicitlyEnabledPlugins,
        ]);
        return Array.from(finalEnabledPlugins.values());
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
        // tslint:disable-next-line
        console.log(`[${level.toUpperCase()}] ${msg}`);
      },

      performanceDebug: {
        enabled: false,
        size: 30,
        threshold: 200,
      },

      customArgumentTypes,

      sendSuccessMessageFn(channel, body) {
        const guildId = channel instanceof TextChannel ? channel.guild.id : undefined;
        const emoji = guildId ? bot.getLoadedGuild(guildId).config.success_emoji : undefined;
        channel.createMessage(successMessage(body, emoji));
      },

      sendErrorMessageFn(channel, body) {
        const guildId = channel instanceof TextChannel ? channel.guild.id : undefined;
        const emoji = guildId ? bot.getLoadedGuild(guildId).config.error_emoji : undefined;
        channel.createMessage(errorMessage(body, emoji));
      },
    },
  });

  client.once("ready", () => {
    startUptimeCounter();
  });

  logger.info("Starting the bot");
  bot.run();
});
