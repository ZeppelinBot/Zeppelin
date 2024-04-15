import { PluginOptions, guildPlugin } from "knub";
import { onGuildEvent } from "../../data/GuildEvents";
import { GuildReminders } from "../../data/GuildReminders";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { RemindCmd } from "./commands/RemindCmd";
import { RemindersCmd } from "./commands/RemindersCmd";
import { RemindersDeleteCmd } from "./commands/RemindersDeleteCmd";
import { postReminder } from "./functions/postReminder";
import { RemindersPluginType, zRemindersConfig } from "./types";
import { CommonPlugin } from "../Common/CommonPlugin";

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
