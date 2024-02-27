import { PermissionFlagsBits } from "discord.js";
import { guildPluginUserContextMenuCommand } from "knub";
import { launchWarnActionModal } from "../actions/warn";

export const WarnCmd = guildPluginUserContextMenuCommand({
  name: "Warn",
  defaultMemberPermissions: PermissionFlagsBits.ManageMessages.toString(),
  async run({ pluginData, interaction }) {
    await launchWarnActionModal(pluginData, interaction, interaction.targetId);
  },
});
