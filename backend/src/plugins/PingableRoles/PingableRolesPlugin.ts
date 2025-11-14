import { guildPlugin } from "vety";
import { GuildPingableRoles } from "../../data/GuildPingableRoles.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { PingableRoleDisableCmd } from "./commands/PingableRoleDisableCmd.js";
import { PingableRoleEnableCmd } from "./commands/PingableRoleEnableCmd.js";
import { PingableRolesPluginType, zPingableRolesConfig } from "./types.js";

export const PingableRolesPlugin = guildPlugin<PingableRolesPluginType>()({
  name: "pingable_roles",

  configSchema: zPingableRolesConfig,
  defaultOverrides: [
    {
      level: ">=100",
      config: {
        can_manage: true,
      },
    },
  ],

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
