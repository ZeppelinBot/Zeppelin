import { PermissionFlagsBits } from "discord.js";
import { guildPluginUserContextMenuCommand } from "knub";
import { launchBanActionModal } from "../actions/ban";

export const BanCmd = guildPluginUserContextMenuCommand({
  name: "Ban",
  defaultMemberPermissions: PermissionFlagsBits.BanMembers.toString(),
  async run({ pluginData, interaction }) {
    await launchBanActionModal(pluginData, interaction, interaction.targetId);
  },
});
