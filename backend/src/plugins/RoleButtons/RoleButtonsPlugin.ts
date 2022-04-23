import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, RoleButtonsPluginType } from "./types";
import { mapToPublicFn } from "../../pluginUtils";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { applyAllRoleButtons } from "./functions/applyAllRoleButtons";
import { GuildRoleButtons } from "../../data/GuildRoleButtons";
import { RoleManagerPlugin } from "../RoleManager/RoleManagerPlugin";
import { StrictValidationError } from "../../validatorUtils";
import { onButtonInteraction } from "./events/buttonInteraction";

export const RoleButtonsPlugin = zeppelinGuildPlugin<RoleButtonsPluginType>()({
  name: "role_buttons",
  configSchema: ConfigSchema,

  configPreprocessor(options) {
    // Auto-fill "name" property for buttons based on the object key
    const buttonsArray = Array.isArray(options.config?.buttons) ? options.config.buttons : [];
    const seenMessages = new Set();
    for (const [name, buttonsConfig] of Object.entries(options.config?.buttons ?? {})) {
      if (name.length > 16) {
        throw new StrictValidationError(["Name for role buttons can be at most 16 characters long"]);
      }

      if (buttonsConfig) {
        buttonsConfig.name = name;
        // 5 action rows * 5 buttons
        if (buttonsConfig.options?.length > 25) {
          throw new StrictValidationError(["A single message can have at most 25 role buttons"]);
        }

        if (buttonsConfig.message) {
          if ("message_id" in buttonsConfig.message) {
            if (seenMessages.has(buttonsConfig.message.message_id)) {
              throw new StrictValidationError(["Can't target the same message with two sets of role buttons"]);
            }
            seenMessages.add(buttonsConfig.message.message_id);
          }
        }
      }
    }

    return options;
  },

  dependencies: () => [LogsPlugin, RoleManagerPlugin],

  events: [onButtonInteraction],

  beforeLoad(pluginData) {
    pluginData.state.roleButtons = GuildRoleButtons.getGuildInstance(pluginData.guild.id);
  },

  async afterLoad(pluginData) {
    await applyAllRoleButtons(pluginData);
  },
});
