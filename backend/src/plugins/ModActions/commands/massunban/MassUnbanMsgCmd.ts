import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { actualMassBanCmd } from "../../functions/actualCommands/actualMassBanCmd";
import { modActionsMsgCmd } from "../../types";

export const MassUnbanMsgCmd = modActionsMsgCmd({
  trigger: "massunban",
  permission: "can_massunban",
  description: "Mass-unban a list of user IDs",

  signature: [
    {
      userIds: ct.string({ rest: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    actualMassBanCmd(pluginData, msg, args.userIds, msg.member);
  },
});
