import { CooldownManager, guildPlugin } from "vety";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { RoleAddCmd } from "./commands/RoleAddCmd.js";
import { RoleHelpCmd } from "./commands/RoleHelpCmd.js";
import { RoleRemoveCmd } from "./commands/RoleRemoveCmd.js";
import { SelfGrantableRolesPluginType, zSelfGrantableRolesConfig } from "./types.js";

export const SelfGrantableRolesPlugin = guildPlugin<SelfGrantableRolesPluginType>()({
  name: "self_grantable_roles",

  configSchema: zSelfGrantableRolesConfig,

  // prettier-ignore
  messageCommands: [
    RoleHelpCmd,
    RoleRemoveCmd,
    RoleAddCmd,
  ],

  beforeLoad(pluginData) {
    pluginData.state.cooldowns = new CooldownManager();
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },
});
