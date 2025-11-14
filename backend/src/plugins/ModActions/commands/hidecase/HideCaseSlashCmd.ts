import { slashOptions } from "vety";
import { modActionsSlashCmd } from "../../types.js";
import { actualHideCaseCmd } from "./actualHideCaseCmd.js";

export const HideCaseSlashCmd = modActionsSlashCmd({
  name: "hidecase",
  configPermission: "can_hidecase",
  description: "Hide the specified case so it doesn't appear in !cases or !info",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "case-number", description: "The number of the case to hide", required: true }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    actualHideCaseCmd(pluginData, interaction, options["case-number"].split(/\D+/).map(Number));
  },
});
