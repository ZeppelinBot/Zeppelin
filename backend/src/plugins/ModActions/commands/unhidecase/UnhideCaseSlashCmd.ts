import { slashOptions } from "knub";
import { actualUnhideCaseCmd } from "../../functions/actualCommands/actualUnhideCaseCmd";

export const UnhideCaseSlashCmd = {
  name: "unhidecase",
  configPermission: "can_hidecase",
  description: "Un-hide the specified case",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "case-number", description: "The number of the case to unhide", required: true }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    actualUnhideCaseCmd(pluginData, interaction, options["case-number"].split(/[\s,]+/).map(Number));
  },
};
