import { slashOptions } from "knub";
import { actualUnhideCaseCmd } from "./actualUnhideCaseCmd";
import { modActionsSlashCmd } from "../../types";

export const UnhideCaseSlashCmd = modActionsSlashCmd({
  name: "unhidecase",
  configPermission: "can_hidecase",
  description: "Un-hide the specified case",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "case-number", description: "The number of the case to unhide", required: true }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    actualUnhideCaseCmd(pluginData, interaction, options["case-number"].split(/\D+/).map(Number));
  },
});
