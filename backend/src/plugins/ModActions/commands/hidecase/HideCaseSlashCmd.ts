import { slashOptions } from "knub";
import { actualHideCaseCmd } from "../../functions/actualCommands/actualHideCaseCmd";

export const HideCaseSlashCmd = {
  name: "hidecase",
  configPermission: "can_hidecase",
  description: "Hide the specified case so it doesn't appear in !cases or !info",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "case-number", description: "The number of the case to hide", required: true }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    actualHideCaseCmd(pluginData, interaction, options["case-number"].split(/[\s,]+/).map(Number));
  },
};
