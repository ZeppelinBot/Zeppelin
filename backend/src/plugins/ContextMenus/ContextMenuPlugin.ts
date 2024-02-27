import { PluginOptions } from "knub";
import { GuildCases } from "src/data/GuildCases";
import { CasesPlugin } from "../Cases/CasesPlugin";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { ModActionsPlugin } from "../ModActions/ModActionsPlugin";
import { MutesPlugin } from "../Mutes/MutesPlugin";
import { UtilityPlugin } from "../Utility/UtilityPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { BanCmd } from "./commands/BanUserCtxCmd";
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

  dependencies: () => [CasesPlugin, MutesPlugin, ModActionsPlugin, LogsPlugin, UtilityPlugin],
  configParser: (input) => zContextMenusConfig.parse(input),
  defaultOptions,

  contextMenuCommands: [ModMenuCmd, NoteCmd, WarnCmd, MuteCmd, BanCmd],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.cases = GuildCases.getGuildInstance(guild.id);
  },
});
