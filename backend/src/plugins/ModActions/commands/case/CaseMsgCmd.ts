import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualCaseCmd } from "./actualCaseCmd.js";

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
    actualCaseCmd(pluginData, msg, msg.author.id, args.caseNumber);
  },
});
