import { PluginOverride, guildPlugin } from "vety";
import { GuildCases } from "../../data/GuildCases.js";
import { CasesPlugin } from "../Cases/CasesPlugin.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { ModActionsPlugin } from "../ModActions/ModActionsPlugin.js";
import { MutesPlugin } from "../Mutes/MutesPlugin.js";
import { UtilityPlugin } from "../Utility/UtilityPlugin.js";
import { BanCmd } from "./commands/BanUserCtxCmd.js";
import { CleanCmd } from "./commands/CleanMessageCtxCmd.js";
import { ModMenuCmd } from "./commands/ModMenuUserCtxCmd.js";
import { MuteCmd } from "./commands/MuteUserCtxCmd.js";
import { NoteCmd } from "./commands/NoteUserCtxCmd.js";
import { WarnCmd } from "./commands/WarnUserCtxCmd.js";
import { ContextMenuPluginType, zContextMenusConfig } from "./types.js";

const defaultOverrides: Array<PluginOverride<ContextMenuPluginType>> = [
  {
    level: ">=50",
    config: {
      can_use: true,

      can_open_mod_menu: true,
    },
  },
];

export const ContextMenuPlugin = guildPlugin<ContextMenuPluginType>()({
  name: "context_menu",

  dependencies: () => [CasesPlugin, MutesPlugin, ModActionsPlugin, LogsPlugin, UtilityPlugin],
  configSchema: zContextMenusConfig,
  defaultOverrides,

  contextMenuCommands: [ModMenuCmd, NoteCmd, WarnCmd, MuteCmd, BanCmd, CleanCmd],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.cases = GuildCases.getGuildInstance(guild.id);
  },
});
