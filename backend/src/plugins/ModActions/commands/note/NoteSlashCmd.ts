import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import { slashOptions } from "knub";
import { sendErrorMessage } from "../../../../pluginUtils";
import { actualNoteCmd } from "../../functions/actualNoteCmd";

export const NoteSlashCmd = {
  name: "note",
  description: "Add a note to the specified user",
  allowDms: false,
  configPermission: "can_note",

  signature: [
    slashOptions.user({ name: "user", description: "The user to add a note to", required: true }),
    slashOptions.string({ name: "note", description: "The note to add to the user", required: false }),
    ...new Array(10).fill(0).map((_, i) => {
      return {
        name: `attachment${i + 1}`,
        description: "An attachment to add to the note",
        type: ApplicationCommandOptionType.Attachment,
        required: false,
        resolveValue: (interaction: ChatInputCommandInteraction) => {
          return interaction.options.getAttachment(`attachment${i + 1}`);
        },
        getExtraAPIProps: () => ({}),
      };
    }),
  ],

  async run({ interaction, options, pluginData }) {
    const attachments = new Array(10)
      .fill(0)
      .map((_, i) => {
        return options[`attachment${i + 1}`];
      })
      .filter((a) => a);

    if ((!options.note || options.note.trim() === "") && attachments.length < 1) {
      sendErrorMessage(pluginData, interaction, "Text or attachment required", undefined, undefined, true);

      return;
    }

    actualNoteCmd(pluginData, interaction, interaction.user, attachments, options.user, options.note || "");
  },
};
