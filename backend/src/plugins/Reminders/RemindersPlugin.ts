import { guildPlugin } from "vety";
import { onGuildEvent } from "../../data/GuildEvents.js";
import { GuildReminders } from "../../data/GuildReminders.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin.js";
import { RemindCmd } from "./commands/RemindCmd.js";
import { RemindersCmd } from "./commands/RemindersCmd.js";
import { RemindersDeleteCmd } from "./commands/RemindersDeleteCmd.js";
import { postReminder } from "./functions/postReminder.js";
import { RemindersPluginType, zRemindersConfig } from "./types.js";

export const RemindersPlugin = guildPlugin<RemindersPluginType>()({
  name: "reminders",

  dependencies: () => [TimeAndDatePlugin],
  configSchema: zRemindersConfig,
  defaultOverrides: [
    {
      level: ">=50",
      config: {
        can_use: true,
      },
    },
  ],

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

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
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
