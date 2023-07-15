import { guildPluginUserContextMenuCommand } from "knub";
import { launchNoteActionModal } from "../actions/note";

export const NoteCmd = guildPluginUserContextMenuCommand({
  name: "Note",
  async run({ pluginData, interaction }) {
    await launchNoteActionModal(pluginData, interaction, interaction.targetId);
  },
});
