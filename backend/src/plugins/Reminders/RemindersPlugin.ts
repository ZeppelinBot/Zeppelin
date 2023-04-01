import { PluginOptions } from "knub";
import { onGuildEvent } from "../../data/GuildEvents";
import { GuildReminders } from "../../data/GuildReminders";
import { makeIoTsConfigParser } from "../../pluginUtils";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { RemindCmd } from "./commands/RemindCmd";
import { RemindersCmd } from "./commands/RemindersCmd";
import { RemindersDeleteCmd } from "./commands/RemindersDeleteCmd";
import { postReminder } from "./functions/postReminder";
import { ConfigSchema, RemindersPluginType } from "./types";

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
    configSchema: ConfigSchema,
  },

  dependencies: () => [TimeAndDatePlugin],
  configParser: makeIoTsConfigParser(ConfigSchema),
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
