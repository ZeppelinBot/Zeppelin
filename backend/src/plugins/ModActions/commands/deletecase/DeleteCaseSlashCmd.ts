import { slashOptions } from "knub";
import { actualDeleteCaseCmd } from "../../functions/actualCommands/actualDeleteCaseCmd";

const opts = [slashOptions.boolean({ name: "force", description: "Whether or not to force delete", required: false })];

export const DeleteCaseSlashCmd = {
  name: "deletecase",
  configPermission: "can_deletecase",
  description: "Delete the specified case. This operation can *not* be reversed.",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "case-number", description: "The number of the case to delete", required: true }),

    ...opts,
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });

    actualDeleteCaseCmd(
      pluginData,
      interaction,
      interaction.member,
      options["case-number"].split(/[\s,]+/),
      !!options.force,
    );
  },
};
