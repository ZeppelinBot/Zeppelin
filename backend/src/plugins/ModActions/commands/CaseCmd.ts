import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import { sendErrorMessage } from "../../../pluginUtils";
import { modActionsCmd } from "../types";

export const CaseCmd = modActionsCmd({
  trigger: "case",
  permission: "can_view",
  description: "Show information about a specific case",

  signature: [
    {
      caseNumber: ct.number(),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const theCase = await pluginData.state.cases.findByCaseNumber(args.caseNumber);

    if (!theCase) {
      sendErrorMessage(pluginData, msg.channel, "Case not found");
      return;
    }

    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    const embed = await casesPlugin.getCaseEmbed(theCase.id, msg.author.id);
    msg.channel.send(embed);
  },
});
