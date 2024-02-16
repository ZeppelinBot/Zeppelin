import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { actualMassMuteCmd } from "../../functions/actualCommands/actualMassMuteCmd";
import { modActionsMsgCmd } from "../../types";

export const MassMuteMsgCmd = modActionsMsgCmd({
  trigger: "massmute",
  permission: "can_massmute",
  description: "Mass-mute a list of user IDs",

  signature: [
    {
      userIds: ct.string({ rest: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    actualMassMuteCmd(pluginData, msg, args.userIds, msg.member);
  },
});
