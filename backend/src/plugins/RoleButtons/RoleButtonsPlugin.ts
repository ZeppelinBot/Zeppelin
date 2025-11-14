import { guildPlugin } from "vety";
import { GuildRoleButtons } from "../../data/GuildRoleButtons.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { RoleManagerPlugin } from "../RoleManager/RoleManagerPlugin.js";
import { resetButtonsCmd } from "./commands/resetButtons.js";
import { onButtonInteraction } from "./events/buttonInteraction.js";
import { applyAllRoleButtons } from "./functions/applyAllRoleButtons.js";
import { RoleButtonsPluginType, zRoleButtonsConfig } from "./types.js";

export const RoleButtonsPlugin = guildPlugin<RoleButtonsPluginType>()({
  name: "role_buttons",

  configSchema: zRoleButtonsConfig,
  defaultOverrides: [
    {
      level: ">=100",
      config: {
        can_reset: true,
      },
    },
  ],

  dependencies: () => [LogsPlugin, RoleManagerPlugin],

  events: [onButtonInteraction],

  messageCommands: [resetButtonsCmd],

  beforeLoad(pluginData) {
    pluginData.state.roleButtons = GuildRoleButtons.getGuildInstance(pluginData.guild.id);
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  async afterLoad(pluginData) {
    await applyAllRoleButtons(pluginData);
  },
});
