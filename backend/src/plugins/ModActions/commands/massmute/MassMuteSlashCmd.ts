import { slashOptions } from "knub";
import { actualMassMuteCmd } from "../../functions/actualCommands/actualMassMuteCmd";

export const MassMuteSlashSlashCmd = {
  name: "massmute",
  configPermission: "can_massmute",
  description: "Mass-mute a list of user IDs",
  allowDms: false,

  signature: [slashOptions.string({ name: "user-ids", description: "The list of user IDs to mute", required: true })],

  async run({ interaction, options, pluginData }) {
    actualMassMuteCmd(pluginData, interaction, options["user-ids"].split(/[\s,\r\n]+/), interaction.member);
  },
};
