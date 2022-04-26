import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, RoleButtonsPluginType } from "./types";
import { mapToPublicFn } from "../../pluginUtils";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { applyAllRoleButtons } from "./functions/applyAllRoleButtons";
import { GuildRoleButtons } from "../../data/GuildRoleButtons";
import { RoleManagerPlugin } from "../RoleManager/RoleManagerPlugin";
import { StrictValidationError } from "../../validatorUtils";
import { onButtonInteraction } from "./events/buttonInteraction";
import { pluginInfo } from "./info";
import { createButtonComponents } from "./functions/createButtonComponents";
import { TooManyComponentsError } from "./functions/TooManyComponentsError";
import { resetButtonsCmd } from "./commands/resetButtons";

export const RoleButtonsPlugin = zeppelinGuildPlugin<RoleButtonsPluginType>()({
  name: "role_buttons",
  configSchema: ConfigSchema,
  info: pluginInfo,
  showInDocs: true,

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

        if (buttonsConfig.message) {
          if ("message_id" in buttonsConfig.message) {
            if (seenMessages.has(buttonsConfig.message.message_id)) {
              throw new StrictValidationError(["Can't target the same message with two sets of role buttons"]);
            }
            seenMessages.add(buttonsConfig.message.message_id);
          }
        }

        if (buttonsConfig.options) {
          try {
            createButtonComponents(buttonsConfig);
          } catch (err) {
            if (err instanceof TooManyComponentsError) {
              throw new StrictValidationError(["Too many options; can only have max 5 buttons per row on max 5 rows."]);
            }
            throw new StrictValidationError(["Error validating options"]);
          }
        }
      }
    }

    return options;
  },

  dependencies: () => [LogsPlugin, RoleManagerPlugin],

  events: [onButtonInteraction],

  commands: [resetButtonsCmd],

  beforeLoad(pluginData) {
    pluginData.state.roleButtons = GuildRoleButtons.getGuildInstance(pluginData.guild.id);
  },

  async afterLoad(pluginData) {
    await applyAllRoleButtons(pluginData);
  },
});
