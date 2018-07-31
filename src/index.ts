require("dotenv").config();

process.on("unhandledRejection", (reason, p) => {
  // tslint:disable-next-line
  console.error(reason);
  process.exit();
});

// Always use UTC
// This is also set for the database in knexfile
import * as moment from "moment-timezone";
moment.tz.setDefault("UTC");

import { Client } from "eris";
import { Knub, logger } from "knub";
import { BotControlPlugin } from "./plugins/BotControl";
import { ModActionsPlugin } from "./plugins/ModActions";
import { UtilityPlugin } from "./plugins/Utility";
import { LogsPlugin } from "./plugins/Logs";
import { PostPlugin } from "./plugins/Post";
import { ReactionRolesPlugin } from "./plugins/ReactionRoles";
import { CensorPlugin } from "./plugins/Censor";
import { PersistPlugin } from "./plugins/Persist";
import { SpamPlugin } from "./plugins/Spam";
import knex from "./knex";

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
      spam: SpamPlugin
    },
    globalPlugins: {
      bot_control: BotControlPlugin
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
