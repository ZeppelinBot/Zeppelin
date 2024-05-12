import { CooldownManager, PluginOptions, guildPlugin } from "knub";
import { CommonPlugin } from "../Common/CommonPlugin";
import { RoleAddCmd } from "./commands/RoleAddCmd";
import { RoleHelpCmd } from "./commands/RoleHelpCmd";
import { RoleRemoveCmd } from "./commands/RoleRemoveCmd";
import { SelfGrantableRolesPluginType, zSelfGrantableRolesConfig } from "./types";

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

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },
});
