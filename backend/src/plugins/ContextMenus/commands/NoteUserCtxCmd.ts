import { PermissionFlagsBits } from "discord.js";
import { guildPluginUserContextMenuCommand } from "vety";
import { launchNoteActionModal } from "../actions/note.js";

export const NoteCmd = guildPluginUserContextMenuCommand({
  name: "Note",
  defaultMemberPermissions: PermissionFlagsBits.ManageMessages.toString(),
  async run({ pluginData, interaction }) {
    await launchNoteActionModal(pluginData, interaction, interaction.targetId);
  },
});
