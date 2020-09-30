import { modActionsCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";

export const UnhideCaseCmd = modActionsCmd({
  trigger: ["unhide", "unhidecase", "unhide_case"],
  permission: "can_hidecase",
  description: "Un-hide the specified case, making it appear in !cases and !info again",

  signature: [
    {
      caseNum: ct.number(),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const theCase = await pluginData.state.cases.findByCaseNumber(args.caseNum);
    if (!theCase) {
      sendErrorMessage(pluginData, msg.channel, "Case not found!");
      return;
    }

    await pluginData.state.cases.setHidden(theCase.id, false);
    sendSuccessMessage(pluginData, msg.channel, `Case #${theCase.case_number} is no longer hidden!`);
  },
});
