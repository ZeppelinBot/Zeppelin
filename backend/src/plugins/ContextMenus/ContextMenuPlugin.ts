import { PluginOptions } from "knub";
import { GuildCases } from "../../data/GuildCases";
import { trimPluginDescription } from "../../utils";
import { CasesPlugin } from "../Cases/CasesPlugin";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { ModActionsPlugin } from "../ModActions/ModActionsPlugin";
import { MutesPlugin } from "../Mutes/MutesPlugin";
import { UtilityPlugin } from "../Utility/UtilityPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { BanCmd } from "./commands/BanUserCtxCmd";
import { CleanCmd } from "./commands/CleanMessageCtxCmd";
import { ModMenuCmd } from "./commands/ModMenuUserCtxCmd";
import { MuteCmd } from "./commands/MuteUserCtxCmd";
import { NoteCmd } from "./commands/NoteUserCtxCmd";
import { WarnCmd } from "./commands/WarnUserCtxCmd";
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

export const ContextMenuPlugin = zeppelinGuildPlugin<ContextMenuPluginType>()({
  name: "context_menu",
  showInDocs: true,
  info: {
    prettyName: "Context Menus",
    description: trimPluginDescription(`
      This plugin provides command shortcuts via context menus
    `),
    configSchema: zContextMenusConfig,
  },

  dependencies: () => [CasesPlugin, MutesPlugin, ModActionsPlugin, LogsPlugin, UtilityPlugin],
  configParser: (input) => zContextMenusConfig.parse(input),
  defaultOptions,

  contextMenuCommands: [ModMenuCmd, NoteCmd, WarnCmd, MuteCmd, BanCmd, CleanCmd],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.cases = GuildCases.getGuildInstance(guild.id);
  },
});
