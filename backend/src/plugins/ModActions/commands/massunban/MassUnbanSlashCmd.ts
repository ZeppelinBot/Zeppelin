import { slashOptions } from "knub";
import { actualMassUnbanCmd } from "../../functions/actualCommands/actualMassUnbanCmd";

export const MassUnbanSlashCmd = {
  name: "massunban",
  configPermission: "can_massunban",
  description: "Mass-unban a list of user IDs",
  allowDms: false,

  signature: [slashOptions.string({ name: "user-ids", description: "The list of user IDs to unban", required: true })],

  async run({ interaction, options, pluginData }) {
    actualMassUnbanCmd(pluginData, interaction, options["user-ids"].split(/[\s,\r\n]+/), interaction.member);
  },
};
