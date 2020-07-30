import { PluginOptions } from "knub";
import { ConfigSchema, RemindersPluginType } from "./types";
import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { GuildReminders } from "src/data/GuildReminders";
import { postDueRemindersLoop } from "./utils/postDueRemindersLoop";
import { RemindCmd } from "./commands/RemindCmd";
import { RemindersCmd } from "./commands/RemindersCmd";
import { RemindersDeleteCmd } from "./commands/RemindersDeleteCmd";

const defaultOptions: PluginOptions<RemindersPluginType> = {
  config: {
    can_use: false,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_use: true,
      },
    },
  ],
};

export const RemindersPlugin = zeppelinPlugin<RemindersPluginType>()("reminders", {
  showInDocs: true,
  info: {
    prettyName: "Reminders",
  },

  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
    RemindCmd,
    RemindersCmd,
    RemindersDeleteCmd,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.reminders = GuildReminders.getGuildInstance(guild.id);
    state.tries = new Map();
    state.unloaded = false;

    state.postRemindersTimeout = null;
    postDueRemindersLoop(pluginData);
  },

  onUnload(pluginData) {
    clearTimeout(pluginData.state.postRemindersTimeout);
    pluginData.state.unloaded = true;
  },
});
