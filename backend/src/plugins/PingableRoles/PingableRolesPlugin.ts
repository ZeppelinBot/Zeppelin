import { PluginOptions } from "knub";
import { GuildPingableRoles } from "../../data/GuildPingableRoles";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { PingableRoleDisableCmd } from "./commands/PingableRoleDisableCmd";
import { PingableRoleEnableCmd } from "./commands/PingableRoleEnableCmd";
import { PingableRolesPluginType, zPingableRolesConfig } from "./types";

const defaultOptions: PluginOptions<PingableRolesPluginType> = {
  config: {
    can_manage: false,
  },
  overrides: [
    {
      level: ">=100",
      config: {
        can_manage: true,
      },
    },
  ],
};

export const PingableRolesPlugin = zeppelinGuildPlugin<PingableRolesPluginType>()({
  name: "pingable_roles",
  showInDocs: true,
  info: {
    prettyName: "Pingable roles",
    configSchema: zPingableRolesConfig,
  },

  configParser: (input) => zPingableRolesConfig.parse(input),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
    PingableRoleEnableCmd,
    PingableRoleDisableCmd,
  ],

  // prettier-ignore
  events: [
    // FIXME: Temporarily disabled for performance. This is very buggy anyway, so consider removing in the future.
    // TypingEnablePingableEvt,
    // MessageCreateDisablePingableEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.pingableRoles = GuildPingableRoles.getGuildInstance(guild.id);
    state.cache = new Map();
    state.timeouts = new Map();
  },
});
