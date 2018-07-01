require("dotenv").config();

process.on("unhandledRejection", (reason, p) => {
  // tslint:disable-next-line
  console.error(reason);
  process.exit();
});

import { Client } from "eris";
import { Knub, logger } from "knub";
import { BotControlPlugin } from "./plugins/BotControl";
import { ModActionsPlugin } from "./plugins/ModActions";
import { UtilityPlugin } from "./plugins/Utility";
import knex from "./knex";

// Run latest database migrations
logger.info("Running database migrations");
knex.migrate.latest().then(() => {
  const client = new Client(process.env.TOKEN);

  const bot = new Knub(client, {
    plugins: {
      utility: UtilityPlugin,
      mod_notes: ModActionsPlugin
    },
    globalPlugins: {
      bot_control: BotControlPlugin
    }
  });

  logger.info("Starting the bot");
  bot.run();
});
