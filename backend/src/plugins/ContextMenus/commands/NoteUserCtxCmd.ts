import { PermissionFlagsBits } from "discord.js";
import { guildPluginUserContextMenuCommand } from "knub";
import { launchNoteActionModal } from "../actions/note";

export const NoteCmd = guildPluginUserContextMenuCommand({
  name: "Note",
  defaultMemberPermissions: PermissionFlagsBits.ManageMessages.toString(),
  async run({ pluginData, interaction }) {
    await launchNoteActionModal(pluginData, interaction, interaction.targetId);
  },
});
