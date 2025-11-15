import { GuildMember } from "discord.js";
import { guildPluginEventListener } from "vety";
import { SECONDS } from "../../../utils.js";
import { renderRecursively } from "../../../utils.js";
import { parseCustomId } from "../../../utils/parseCustomId.js";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin.js";
import { getAllRolesInButtons } from "../functions/getAllRolesInButtons.js";
import { RoleButtonsPluginType, TRoleButtonOption } from "../types.js";
import { renderTemplate, TemplateSafeValueContainer } from "../../../templateFormatter.js";
import { memberToTemplateSafeMember, roleToTemplateSafeRole, userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";

const ROLE_BUTTON_CD = 5 * SECONDS;

export const onButtonInteraction = guildPluginEventListener<RoleButtonsPluginType>()({
  event: "interactionCreate",
  async listener({ pluginData, args }) {
    if (!args.interaction.isButton()) {
      return;
    }

    const { namespace, data } = parseCustomId(args.interaction.customId);
    if (namespace !== "roleButtons") {
      return;
    }

    const config = pluginData.config.get();
    const { name, index: optionIndex } = data;
    // For some reason TS's type inference fails here so using a type annotation
    const buttons = config.buttons[name];
    const option: TRoleButtonOption | undefined = buttons?.options[optionIndex];
    if (!buttons || !option) {
      args.interaction
        .reply({
          ephemeral: true,
          content: "Invalid option selected",
        })
        .catch((err) => console.trace(err.message));
      return;
    }

    const cdIdentifier = `${args.interaction.user.id}-${optionIndex}`;
    if (pluginData.cooldowns.isOnCooldown(cdIdentifier)) {
      args.interaction.reply({
        ephemeral: true,
        content: "Please wait before clicking the button again",
      });
      return;
    }
    pluginData.cooldowns.setCooldown(cdIdentifier, ROLE_BUTTON_CD);

    const member = args.interaction.member as GuildMember;
    const role = pluginData.guild.roles.cache.get(option.role_id);
    const roleName = role?.name || option.role_id;

    const rolesToRemove: string[] = [];
    const rolesToAdd: string[] = [];

    const renderTemplateText = async (str: string) =>
      renderTemplate(
        str,
        new TemplateSafeValueContainer({
          user: member ? memberToTemplateSafeMember(member) : userToTemplateSafeUser(args.interaction.user),
          role: role ? roleToTemplateSafeRole(role) : new TemplateSafeValueContainer({ name: roleName, id: option.role_id }),
        }),
      );

    if (member.roles.cache.has(option.role_id)) {
      rolesToRemove.push(option.role_id);

      const messageTemplate = config.buttons[name].remove_message || `The role **${roleName}** will be removed shortly!`;
      const formatted = typeof messageTemplate === "string"
        ? await renderTemplateText(messageTemplate)
        : await renderRecursively(messageTemplate, renderTemplateText);

      args.interaction
        .reply({ ephemeral: true, ...(typeof formatted === "string" ? { content: formatted } : formatted) })
        .catch((err) => console.trace(err.message));
    } else {
      rolesToAdd.push(option.role_id);

      if (buttons.exclusive) {
        for (const roleId of getAllRolesInButtons(buttons)) {
          if (member.roles.cache.has(roleId)) {
            rolesToRemove.push(roleId);
          }
        }
      }

      const messageTemplate = config.buttons[name].add_message || `You will receive the **${roleName}** role shortly!`;
      const formatted = typeof messageTemplate === "string"
        ? await renderTemplateText(messageTemplate)
        : await renderRecursively(messageTemplate, renderTemplateText);

      args.interaction
        .reply({ ephemeral: true, ...(typeof formatted === "string" ? { content: formatted } : formatted) })
        .catch((err) => console.trace(err.message));
    }

    for (const roleId of rolesToAdd) {
      pluginData.getPlugin(RoleManagerPlugin).addRole(member.user.id, roleId);
    }
    for (const roleId of rolesToRemove) {
      pluginData.getPlugin(RoleManagerPlugin).removeRole(member.user.id, roleId);
    }
  },
});