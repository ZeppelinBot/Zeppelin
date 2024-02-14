import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { actualCaseCmd } from "../../functions/actualCommands/actualCaseCmd";
import { modActionsMsgCmd } from "../../types";

export const CaseMsgCmd = modActionsMsgCmd({
  trigger: "case",
  permission: "can_view",
  description: "Show information about a specific case",

  signature: [
    {
      caseNumber: ct.number(),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    actualCaseCmd(pluginData, msg.channel, msg.author.id, args.caseNumber);
  },
});
