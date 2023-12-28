import { GuildRoleButtons } from "../../data/GuildRoleButtons";
import { parseIoTsSchema, StrictValidationError } from "../../validatorUtils";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { RoleManagerPlugin } from "../RoleManager/RoleManagerPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { resetButtonsCmd } from "./commands/resetButtons";
import { onButtonInteraction } from "./events/buttonInteraction";
import { applyAllRoleButtons } from "./functions/applyAllRoleButtons";
import { createButtonComponents } from "./functions/createButtonComponents";
import { TooManyComponentsError } from "./functions/TooManyComponentsError";
import { pluginInfo } from "./info";
import { ConfigSchema, RoleButtonsPluginType } from "./types";

export const RoleButtonsPlugin = zeppelinGuildPlugin<RoleButtonsPluginType>()({
  name: "role_buttons",
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

  configParser(input) {
    // Auto-fill "name" property for buttons based on the object key
    const seenMessages = new Set();
    for (const [name, buttonsConfig] of Object.entries<any>((input as any).buttons ?? {})) {
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

    return parseIoTsSchema(ConfigSchema, input);
  },

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
