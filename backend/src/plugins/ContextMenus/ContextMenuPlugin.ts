import { PluginOptions, guildPlugin } from "knub";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { ModActionsPlugin } from "../ModActions/ModActionsPlugin";
import { MutesPlugin } from "../Mutes/MutesPlugin";
import { UtilityPlugin } from "../Utility/UtilityPlugin";
import { ContextMenuPluginType, zContextMenusConfig } from "./types";

const defaultOptions: PluginOptions<ContextMenuPluginType> = {
  config: {
    can_use: false,

    can_open_mod_menu: false,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_use: true,

        can_open_mod_menu: true,
      },
    },
  ],
};

export const ContextMenuPlugin = guildPlugin<ContextMenuPluginType>()({
  name: "context_menu",

  dependencies: () => [CasesPlugin, MutesPlugin, ModActionsPlugin, LogsPlugin, UtilityPlugin],
  configParser: (input) => zContextMenusConfig.parse(input),
  defaultOptions,

  contextMenuCommands: [ModMenuCmd, NoteCmd, WarnCmd, MuteCmd, BanCmd],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.cases = GuildCases.getGuildInstance(guild.id);
  },
});
