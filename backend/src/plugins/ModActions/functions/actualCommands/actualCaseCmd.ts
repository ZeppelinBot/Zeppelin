import { ChatInputCommandInteraction, Message } from "discord.js";
import { GuildPluginData } from "knub";
import { sendContextResponse } from "../../../../pluginUtils";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { ModActionsPluginType } from "../../types";

export async function actualCaseCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  authorId: string,
  caseNumber: number,
  show: boolean | null,
) {
  const theCase = await pluginData.state.cases.findByCaseNumber(caseNumber);

  if (!theCase) {
    pluginData.getPlugin(CommonPlugin).sendErrorMessage(context, "Case not found", undefined, undefined, show !== true);
    return;
  }

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const embed = await casesPlugin.getCaseEmbed(theCase.id, authorId);

  sendContextResponse(context, { ...embed, ephemeral: show !== true });
}
