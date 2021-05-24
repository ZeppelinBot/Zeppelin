import { PluginOptions } from "knub";
import { ConfigSchema, RemindersPluginType } from "./types";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { GuildReminders } from "../../data/GuildReminders";
import { postDueRemindersLoop } from "./utils/postDueRemindersLoop";
import { RemindCmd } from "./commands/RemindCmd";
import { RemindersCmd } from "./commands/RemindersCmd";
import { RemindersDeleteCmd } from "./commands/RemindersDeleteCmd";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";

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

export const RemindersPlugin = zeppelinGuildPlugin<RemindersPluginType>()({
  name: "reminders",
  showInDocs: true,
  info: {
    prettyName: "Reminders",
  },

  dependencies: [TimeAndDatePlugin],
  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
    RemindCmd,
    RemindersCmd,
    RemindersDeleteCmd,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.reminders = GuildReminders.getGuildInstance(guild.id);
    state.tries = new Map();
    state.unloaded = false;

    state.postRemindersTimeout = null;
  },

  afterLoad(pluginData) {
    postDueRemindersLoop(pluginData);
  },

  beforeUnload(pluginData) {
    clearTimeout(pluginData.state.postRemindersTimeout);
    pluginData.state.unloaded = true;
  },
});
