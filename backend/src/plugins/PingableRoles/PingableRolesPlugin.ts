import { PluginOptions, guildPlugin } from "knub";
import { GuildPingableRoles } from "../../data/GuildPingableRoles";
import { PingableRoleDisableCmd } from "./commands/PingableRoleDisableCmd";
import { PingableRoleEnableCmd } from "./commands/PingableRoleEnableCmd";
import { PingableRolesPluginType, zPingableRolesConfig } from "./types";
import { CommonPlugin } from "../Common/CommonPlugin";

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

export const PingableRolesPlugin = guildPlugin<PingableRolesPluginType>()({
  name: "pingable_roles",

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

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },
});
