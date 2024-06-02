import { guildPlugin } from "knub";
import { GuildRoleButtons } from "../../data/GuildRoleButtons.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { RoleManagerPlugin } from "../RoleManager/RoleManagerPlugin.js";
import { resetButtonsCmd } from "./commands/resetButtons.js";
import { onButtonInteraction } from "./events/buttonInteraction.js";
import { applyAllRoleButtons } from "./functions/applyAllRoleButtons.js";
import { RoleButtonsPluginType, zRoleButtonsConfig } from "./types.js";

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

  async afterLoad(pluginData) {
    await applyAllRoleButtons(pluginData);
  },
});
