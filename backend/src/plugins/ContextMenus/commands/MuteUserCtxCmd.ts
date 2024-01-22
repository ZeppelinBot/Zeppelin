import { PermissionFlagsBits } from "discord.js";
import { guildPluginUserContextMenuCommand } from "knub";
import { launchMuteActionModal } from "../actions/mute";

export const MuteCmd = guildPluginUserContextMenuCommand({
  name: "Mute",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers.toString(),
  async run({ pluginData, interaction }) {
    await launchMuteActionModal(pluginData, interaction, interaction.targetId);
  },
});
