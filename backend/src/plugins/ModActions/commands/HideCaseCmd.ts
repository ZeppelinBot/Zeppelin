import { modActionsCommand } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";

export const HideCaseCmd = modActionsCommand({
  trigger: ["hide", "hidecase", "hide_case"],
  permission: "can_hidecase",
  description: "Hide the specified case so it doesn't appear in !cases or !info",

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

    await pluginData.state.cases.setHidden(theCase.id, true);
    sendSuccessMessage(
      pluginData,
      msg.channel,
      `Case #${theCase.case_number} is now hidden! Use \`unhidecase\` to unhide it.`,
    );
  },
});
