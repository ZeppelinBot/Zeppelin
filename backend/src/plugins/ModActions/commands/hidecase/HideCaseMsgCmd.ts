import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualHideCaseCmd } from "./actualHideCaseCmd.js";

export const HideCaseMsgCmd = modActionsMsgCmd({
  trigger: ["hide", "hidecase", "hide_case"],
  permission: "can_hidecase",
  description: "Hide the specified case so it doesn't appear in !cases or !info",

  signature: [
    {
      caseNum: ct.number({ rest: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    actualHideCaseCmd(pluginData, msg, args.caseNum);
  },
});
