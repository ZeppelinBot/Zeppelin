import { guildPlugin } from "knub";
import { GuildRoleButtons } from "../../data/GuildRoleButtons";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { RoleManagerPlugin } from "../RoleManager/RoleManagerPlugin";
import { resetButtonsCmd } from "./commands/resetButtons";
import { onButtonInteraction } from "./events/buttonInteraction";
import { applyAllRoleButtons } from "./functions/applyAllRoleButtons";
import { RoleButtonsPluginType, zRoleButtonsConfig } from "./types";
import { CommonPlugin } from "../Common/CommonPlugin";

export const RoleButtonsPlugin = guildPlugin<RoleButtonsPluginType>()({
  name: "role_buttons",

  defaultOptions: {
    config: {
      buttons: {},
      can_reset: false,
    },
    overrides: [
      {
        level: ">=100",
        config: {
          can_reset: true,
        },
      },
    ],
  },

  configParser: (input) => zRoleButtonsConfig.parse(input),

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
