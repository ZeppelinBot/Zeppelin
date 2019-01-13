import path from "path";
import yaml from "js-yaml";

import _fs from "fs";
const fs = _fs.promises;

import { SimpleError } from "./SimpleError";

require("dotenv").config();

let recentErrors = 0;
const RECENT_ERROR_EXIT_THRESHOLD = 5;
setInterval(() => recentErrors--, 2500);

process.on("unhandledRejection", (reason, p) => {
  console.error(reason);
  if (++recentErrors >= RECENT_ERROR_EXIT_THRESHOLD) process.exit(1);
});

process.on("uncaughtException", err => {
  console.error(err);
  if (++recentErrors >= RECENT_ERROR_EXIT_THRESHOLD) process.exit(1);
});

// Verify required Node.js version
const REQUIRED_NODE_VERSION = "10.14.2";
const requiredParts = REQUIRED_NODE_VERSION.split(".").map(v => parseInt(v, 10));
const actualVersionParts = process.versions.node.split(".").map(v => parseInt(v, 10));
for (const [i, part] of actualVersionParts.entries()) {
  if (part > requiredParts[i]) break;
  if (part === requiredParts[i]) continue;
  throw new SimpleError(`Unsupported Node.js version! Must be at least ${REQUIRED_NODE_VERSION}`);
}

// Always use UTC
import moment from "moment-timezone";
moment.tz.setDefault("UTC");

import { Client } from "eris";
import { Knub, logger } from "knub";
import { connect } from "./data/db";

// Global plugins
import { BotControlPlugin } from "./plugins/BotControl";
import { LogServerPlugin } from "./plugins/LogServer";

// Guild plugins
import { ModActionsPlugin } from "./plugins/ModActions";
import { UtilityPlugin } from "./plugins/Utility";
import { LogsPlugin } from "./plugins/Logs";
import { PostPlugin } from "./plugins/Post";
import { ReactionRolesPlugin } from "./plugins/ReactionRoles";
import { CensorPlugin } from "./plugins/Censor";
import { PersistPlugin } from "./plugins/Persist";
import { SpamPlugin } from "./plugins/Spam";
import { TagsPlugin } from "./plugins/Tags";
import { MessageSaverPlugin } from "./plugins/MessageSaver";
import { CasesPlugin } from "./plugins/Cases";
import { MutesPlugin } from "./plugins/Mutes";
import { SlowmodePlugin } from "./plugins/Slowmode";
import { StarboardPlugin } from "./plugins/Starboard";
import { NameHistoryPlugin } from "./plugins/NameHistory";
import { AutoReactions } from "./plugins/AutoReactions";
import { PingableRoles } from "./plugins/PingableRoles";

// Run latest database migrations
logger.info("Running database migrations");
connect().then(async conn => {
  await conn.runMigrations();

  const client = new Client(process.env.TOKEN, {
    getAllUsers: true
  });
  client.setMaxListeners(100);

  const basePlugins = ["message_saver", "name_history", "cases", "mutes"];

  const bot = new Knub(client, {
    plugins: [
      // Base plugins (always enabled)
      MessageSaverPlugin,
      NameHistoryPlugin,
      CasesPlugin,
      MutesPlugin,

      // Regular plugins
      UtilityPlugin,
      ModActionsPlugin,
      LogsPlugin,
      PostPlugin,
      ReactionRolesPlugin,
      CensorPlugin,
      PersistPlugin,
      SpamPlugin,
      TagsPlugin,
      SlowmodePlugin,
      StarboardPlugin,
      AutoReactions,
      PingableRoles
    ],

    globalPlugins: [BotControlPlugin, LogServerPlugin],

    options: {
      getEnabledPlugins(guildId, guildConfig): string[] {
        const plugins = guildConfig.plugins || {};
        const keys: string[] = Array.from(this.plugins.keys());
        return keys.filter(pluginName => {
          return basePlugins.includes(pluginName) || (plugins[pluginName] && plugins[pluginName].enabled !== false);
        });
      },

      async getConfig(id) {
        const configFile = id ? `${id}.yml` : "global.yml";
        const configPath = path.join("config", configFile);

        try {
          await fs.access(configPath);
        } catch (e) {
          return {};
        }

        const yamlString = await fs.readFile(configPath, { encoding: "utf8" });
        return yaml.safeLoad(yamlString);
      },

      logFn: (level, msg) => {
        if (level === "debug") return;
        console.log(`[${level.toUpperCase()}] ${msg}`);
      }
    }
  });

  logger.info("Starting the bot");
  bot.run();
});
