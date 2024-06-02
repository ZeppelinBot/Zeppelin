import { CooldownManager, PluginOptions, guildPlugin } from "knub";
import { RoleAddCmd } from "./commands/RoleAddCmd.js";
import { RoleHelpCmd } from "./commands/RoleHelpCmd.js";
import { RoleRemoveCmd } from "./commands/RoleRemoveCmd.js";
import { SelfGrantableRolesPluginType, zSelfGrantableRolesConfig } from "./types.js";

const defaultOptions: PluginOptions<SelfGrantableRolesPluginType> = {
  config: {
    entries: {},
    mention_roles: false,
  },
};

export const SelfGrantableRolesPlugin = guildPlugin<SelfGrantableRolesPluginType>()({
  name: "self_grantable_roles",

  configParser: (input) => zSelfGrantableRolesConfig.parse(input),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
    RoleHelpCmd,
    RoleRemoveCmd,
    RoleAddCmd,
  ],

  beforeLoad(pluginData) {
    pluginData.state.cooldowns = new CooldownManager();
  },
});
