import { slashOptions } from "knub";
import { actualMassBanCmd } from "../../functions/actualCommands/actualMassBanCmd";

export const MassBanSlashCmd = {
  name: "massban",
  configPermission: "can_massban",
  description: "Mass-ban a list of user IDs",
  allowDms: false,

  signature: [slashOptions.string({ name: "user-ids", description: "The list of user IDs to ban", required: true })],

  async run({ interaction, options, pluginData }) {
    actualMassBanCmd(pluginData, interaction, options["user-ids"].split(/[\s,\r\n]+/), interaction.member);
  },
};
