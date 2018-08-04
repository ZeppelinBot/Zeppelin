require("dotenv").config();

process.on("unhandledRejection", (reason, p) => {
  // tslint:disable-next-line
  console.error(reason);
  process.exit(1);
});

process.on("uncaughtException", err => {
  if (err.message && err.message.startsWith("DiscordHTTPError")) {
    console.error(err);
    return;
  } else {
    console.error(err);
    process.exit(1);
  }
});

// Always use UTC
// This is also set for the database in knexfile
import moment from "moment-timezone";
moment.tz.setDefault("UTC");

import { Client } from "eris";
import { Knub, logger } from "knub";
import knex from "./knex";

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

// Run latest database migrations
logger.info("Running database migrations");
knex.migrate.latest().then(() => {
  const client = new Client(process.env.TOKEN, {
    getAllUsers: true
  });
  client.setMaxListeners(100);

  const bot = new Knub(client, {
    plugins: {
      utility: UtilityPlugin,
      mod_actions: ModActionsPlugin,
      logs: LogsPlugin,
      post: PostPlugin,
      reaction_roles: ReactionRolesPlugin,
      censor: CensorPlugin,
      persist: PersistPlugin,
      spam: SpamPlugin,
      tags: TagsPlugin
    },
    globalPlugins: {
      bot_control: BotControlPlugin,
      log_server: LogServerPlugin
    },

    options: {
      getEnabledPlugins(guildId, guildConfig): string[] {
        const plugins = guildConfig.plugins || {};
        const keys: string[] = Array.from(this.plugins.keys());
        return keys.filter(pluginName => {
          return plugins[pluginName] && plugins[pluginName].enabled !== false;
        });
      }
    }
  });

  logger.info("Starting the bot");
  bot.run();
});
