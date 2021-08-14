import { PluginOptions } from "knub";
import { GuildContextMenuLinks } from "../../data/GuildContextMenuLinks";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { MutesPlugin } from "../Mutes/MutesPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ContextClickedEvt } from "./events/ContextClickedEvt";
import { ConfigSchema, ContextMenuPluginType } from "./types";
import { loadAllCommands } from "./utils/loadAllCommands";
import { UtilityPlugin } from "../Utility/UtilityPlugin";

const defaultOptions: PluginOptions<ContextMenuPluginType> = {
  config: {
    can_use: false,

    user_muteindef: false,
    user_mute1d: false,
    user_mute1h: false,
    user_info: false,

    message_clean10: false,
    message_clean25: false,
    message_clean50: false,
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

export const ContextMenuPlugin = zeppelinGuildPlugin<ContextMenuPluginType>()({
  name: "context_menu",

  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  events: [
    ContextClickedEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.contextMenuLinks = new GuildContextMenuLinks(guild.id);
  },

  afterLoad(pluginData) {
    loadAllCommands(pluginData);
  },

  dependencies: [MutesPlugin, LogsPlugin, UtilityPlugin],
});
