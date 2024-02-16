import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { actualMassBanCmd } from "../../functions/actualCommands/actualMassBanCmd";
import { modActionsMsgCmd } from "../../types";

export const MassBanMsgCmd = modActionsMsgCmd({
  trigger: "massban",
  permission: "can_massban",
  description: "Mass-ban a list of user IDs",

  signature: [
    {
      userIds: ct.string({ rest: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    actualMassBanCmd(pluginData, msg, args.userIds, msg.member);
  },
});
