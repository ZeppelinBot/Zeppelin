import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { modActionsMsgCmd } from "../../types";
import { actualHideCaseCmd } from "../hidecase/actualHideCaseCmd";

export const UnhideCaseMsgCmd = modActionsMsgCmd({
  trigger: ["unhide", "unhidecase", "unhide_case"],
  permission: "can_hidecase",
  description: "Un-hide the specified case, making it appear in !cases and !info again",

  signature: [
    {
      caseNum: ct.number({ rest: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    actualHideCaseCmd(pluginData, msg, args.caseNum);
  },
});
