import { PermissionFlagsBits } from "discord.js";
import { guildPluginMessageContextMenuCommand } from "vety";
import { launchCleanActionModal } from "../actions/clean.js";

export const CleanCmd = guildPluginMessageContextMenuCommand({
  name: "Clean",
  defaultMemberPermissions: PermissionFlagsBits.ManageMessages.toString(),
  async run({ pluginData, interaction }) {
    await launchCleanActionModal(pluginData, interaction, interaction.targetId);
  },
});
