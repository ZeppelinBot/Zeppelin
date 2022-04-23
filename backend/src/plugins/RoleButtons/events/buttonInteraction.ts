import { typedGuildEventListener } from "knub";
import { RoleButtonsPluginType, TRoleButtonOption } from "../types";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin";

export const onButtonInteraction = typedGuildEventListener<RoleButtonsPluginType>()({
  event: "interactionCreate",
  async listener({ pluginData, args }) {
    if (!args.interaction.isButton() || !args.interaction.customId.startsWith("roleButtons:")) {
      return;
    }

    const config = pluginData.config.get();
    const [, name, optionIndex] = args.interaction.customId.split(":");
    // For some reason TS's type inference fails here so using a type annotation
    const option: TRoleButtonOption | undefined = config.buttons[name]?.options[optionIndex];
    if (!option) {
      args.interaction.reply({
        ephemeral: true,
        content: "Invalid option selected",
      });
      return;
    }

    const member = args.interaction.member || (await pluginData.guild.members.fetch(args.interaction.user.id));
    if (!member) {
      args.interaction.reply({
        ephemeral: true,
        content: "Error while fetching member to apply roles for",
      });
      return;
    }

    const hasRole = Array.isArray(member.roles)
      ? member.roles.includes(option.role_id)
      : member.roles.cache.has(option.role_id);
    if (hasRole) {
      pluginData.getPlugin(RoleManagerPlugin).removeRole(member.user.id, option.role_id);
      args.interaction.reply({
        ephemeral: true,
        content: "The selected role will be removed shortly!",
      });
    } else {
      pluginData.getPlugin(RoleManagerPlugin).addRole(member.user.id, option.role_id);
      args.interaction.reply({
        ephemeral: true,
        content: "You will receive the selected role shortly!",
      });
    }
  },
});
