import { PermissionFlagsBits } from "discord.js";
import { guildPluginMessageContextMenuCommand } from "knub";
import { launchCleanActionModal } from "../actions/clean";

export const CleanCmd = guildPluginMessageContextMenuCommand({
  name: "Clean",
  defaultMemberPermissions: PermissionFlagsBits.ManageMessages.toString(),
  async run({ pluginData, interaction }) {
    await launchCleanActionModal(pluginData, interaction, interaction.targetId);
  },
});
