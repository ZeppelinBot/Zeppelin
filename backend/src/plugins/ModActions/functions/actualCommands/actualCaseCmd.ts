import { ChatInputCommandInteraction, TextBasedChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { sendContextResponse, sendErrorMessage } from "../../../../pluginUtils";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { ModActionsPluginType } from "../../types";

export async function actualCaseCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: TextBasedChannel | ChatInputCommandInteraction,
  authorId: string,
  caseNumber: number,
) {
  const theCase = await pluginData.state.cases.findByCaseNumber(caseNumber);

  if (!theCase) {
    sendErrorMessage(pluginData, context, "Case not found");
    return;
  }

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const embed = await casesPlugin.getCaseEmbed(theCase.id, authorId);

  sendContextResponse(context, embed);
}
