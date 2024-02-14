import { Attachment, ChatInputCommandInteraction, TextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../data/CaseTypes";
import { Case } from "../../../data/entities/Case";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { ModActionsPluginType } from "../types";
import { formatReasonWithAttachments } from "./formatReasonWithAttachments";

export async function updateCase(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: TextBasedChannel | ChatInputCommandInteraction,
  author: User,
  caseNumber?: number,
  note?: string,
  attachments: Attachment[] = [],
) {
  let theCase: Case | null;
  if (caseNumber != null) {
    theCase = await pluginData.state.cases.findByCaseNumber(caseNumber);
  } else {
    theCase = await pluginData.state.cases.findLatestByModId(author.id);
  }

  if (!theCase) {
    sendErrorMessage(pluginData, context, "Case not found");
    return;
  }

  if (!note && attachments.length === 0) {
    sendErrorMessage(pluginData, context, "Text or attachment required");
    return;
  }

  const formattedNote = formatReasonWithAttachments(note ?? "", attachments);

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  await casesPlugin.createCaseNote({
    caseId: theCase.id,
    modId: author.id,
    body: formattedNote,
  });

  pluginData.getPlugin(LogsPlugin).logCaseUpdate({
    mod: author,
    caseNumber: theCase.case_number,
    caseType: CaseTypes[theCase.type],
    note: formattedNote,
  });

  sendSuccessMessage(pluginData, context, `Case \`#${theCase.case_number}\` updated`);
}
