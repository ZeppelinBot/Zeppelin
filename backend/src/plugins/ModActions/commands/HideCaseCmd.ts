import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { modActionsCmd } from "../types";

export const HideCaseCmd = modActionsCmd({
  trigger: ["hide", "hidecase", "hide_case"],
  permission: "can_hidecase",
  description: "Hide the specified case so it doesn't appear in !cases or !info",

  signature: [
    {
      caseNum: ct.number({ rest: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const failed: number[] = [];

    for (const num of args.caseNum) {
      const theCase = await pluginData.state.cases.findByCaseNumber(num);
      if (!theCase) {
        failed.push(num);
        continue;
      }

      await pluginData.state.cases.setHidden(theCase.id, true);
    }

    if (failed.length === args.caseNum.length) {
      sendErrorMessage(pluginData, msg.channel, "None of the cases were found!");
      return;
    }
    const failedAddendum =
      failed.length > 0
        ? `\nThe following cases were not found: ${failed.toString().replace(new RegExp(",", "g"), ", ")}`
        : "";

    const amt = args.caseNum.length - failed.length;
    sendSuccessMessage(
      pluginData,
      msg.channel,
      `${amt} case${amt === 1 ? " is" : "s are"} now hidden! Use \`unhidecase\` to unhide them.${failedAddendum}`,
    );
  },
});
