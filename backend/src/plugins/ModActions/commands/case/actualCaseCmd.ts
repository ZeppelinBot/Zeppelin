import { ChatInputCommandInteraction, Message } from "discord.js";
import { GuildPluginData } from "vety";
import { sendContextResponse } from "../../../../pluginUtils.js";
import { CasesPlugin } from "../../../Cases/CasesPlugin.js";
import { ModActionsPluginType } from "../../types.js";

export async function actualCaseCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  authorId: string,
  caseNumber: number,
  show?: boolean | null,
) {
  const theCase = await pluginData.state.cases.findByCaseNumber(caseNumber);

  if (!theCase) {
    void pluginData.state.common.sendErrorMessage(context, "Case not found", undefined, undefined, show !== true);
    return;
  }

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const content = await casesPlugin.getCaseEmbed(theCase.id, authorId);

  void sendContextResponse(context, content, show !== true);
}
