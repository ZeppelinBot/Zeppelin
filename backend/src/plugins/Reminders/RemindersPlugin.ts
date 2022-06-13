import { PluginOptions } from "knub";
import { GuildReminders } from "../../data/GuildReminders";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { RemindCmd } from "./commands/RemindCmd";
import { RemindersCmd } from "./commands/RemindersCmd";
import { RemindersDeleteCmd } from "./commands/RemindersDeleteCmd";
import { ConfigSchema, RemindersPluginType } from "./types";
import { onGuildEvent } from "../../data/GuildEvents";
import { postReminder } from "./functions/postReminder";

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

  dependencies: () => [TimeAndDatePlugin],
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
  },

  afterLoad(pluginData) {
    pluginData.state.unregisterGuildEventListener = onGuildEvent(pluginData.guild.id, "reminder", (reminder) =>
      postReminder(pluginData, reminder),
    );
  },

  beforeUnload(pluginData) {
    pluginData.state.unregisterGuildEventListener?.();
    pluginData.state.unloaded = true;
  },
});
