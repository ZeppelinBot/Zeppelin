import { slashOptions } from "knub";
import { actualCaseCmd } from "../../functions/actualCommands/actualCaseCmd";

export const CaseSlashCmd = {
  name: "case",
  configPermission: "can_view",
  description: "Show information about a specific case",
  allowDms: false,

  signature: [
    slashOptions.number({ name: "case-number", description: "The number of the case to show", required: true }),
  ],

  async run({ interaction, options, pluginData }) {
    actualCaseCmd(pluginData, interaction, interaction.user.id, options["case-number"]);
  },
};
