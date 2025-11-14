import { slashOptions } from "vety";
import { modActionsSlashCmd } from "../../types.js";
import { actualCaseCmd } from "./actualCaseCmd.js";

const opts = [
  slashOptions.boolean({ name: "show", description: "To make the result visible to everyone", required: false }),
];

export const CaseSlashCmd = modActionsSlashCmd({
  name: "case",
  configPermission: "can_view",
  description: "Show information about a specific case",
  allowDms: false,

  signature: [
    slashOptions.number({ name: "case-number", description: "The number of the case to show", required: true }),

    ...opts,
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: options.show !== true });
    actualCaseCmd(pluginData, interaction, interaction.user.id, options["case-number"], options.show);
  },
});
