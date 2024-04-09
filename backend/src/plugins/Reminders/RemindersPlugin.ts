import { PluginOptions, guildPlugin } from "knub";
import { onGuildEvent } from "../../data/GuildEvents.js";
import { GuildReminders } from "../../data/GuildReminders.js";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin.js";
import { RemindCmd } from "./commands/RemindCmd.js";
import { RemindersCmd } from "./commands/RemindersCmd.js";
import { RemindersDeleteCmd } from "./commands/RemindersDeleteCmd.js";
import { postReminder } from "./functions/postReminder.js";
import { RemindersPluginType, zRemindersConfig } from "./types.js";

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

export const RemindersPlugin = guildPlugin<RemindersPluginType>()({
  name: "reminders",

  dependencies: () => [TimeAndDatePlugin],
  configParser: (input) => zRemindersConfig.parse(input),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
    RemindCmd,
    RemindersCmd,
    RemindersDeleteCmd,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.reminders = GuildReminders.getGuildInstance(guild.id);
    state.tries = new Map();
    state.unloaded = false;
  },

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.unregisterGuildEventListener = onGuildEvent(guild.id, "reminder", (reminder) =>
      postReminder(pluginData, reminder),
    );
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    state.unregisterGuildEventListener?.();
    state.unloaded = true;
  },
});
