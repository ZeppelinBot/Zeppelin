import { typedGuildEventListener } from "knub";
import { RoleButtonsPluginType, TRoleButtonOption } from "../types";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin";
import { GuildMember } from "discord.js";
import { getAllRolesInButtons } from "../functions/getAllRolesInButtons";
import { parseCustomId } from "../../../utils/parseCustomId";

export const onButtonInteraction = typedGuildEventListener<RoleButtonsPluginType>()({
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

    const member = args.interaction.member as GuildMember;
    const role = pluginData.guild.roles.cache.get(option.role_id);
    const roleName = role?.name || option.role_id;

    const rolesToRemove: string[] = [];
    const rolesToAdd: string[] = [];

    if (member.roles.cache.has(option.role_id)) {
      rolesToRemove.push(option.role_id);
      args.interaction
        .reply({
          ephemeral: true,
          content: `The role **${roleName}** will be removed shortly!`,
        })
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

      args.interaction
        .reply({
          ephemeral: true,
          content: `You will receive the **${roleName}** role shortly!`,
        })
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
