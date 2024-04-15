import { Attachment, ChatInputCommandInteraction, Message, User } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../data/CaseTypes";
import { Case } from "../../../data/entities/Case";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { ModActionsPluginType } from "../types";
import { handleAttachmentLinkDetectionAndGetRestriction } from "./attachmentLinkReaction";
import { formatReasonWithMessageLinkForAttachments } from "./formatReasonForAttachments";

export async function updateCase(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  author: User,
  caseNumber?: number | null,
  note = "",
  attachments: Attachment[] = [],
) {
  let theCase: Case | null;
  if (caseNumber != null) {
    theCase = await pluginData.state.cases.findByCaseNumber(caseNumber);
  } else {
    theCase = await pluginData.state.cases.findLatestByModId(author.id);
  }

  if (!theCase) {
    pluginData.state.common.sendErrorMessage(context, "Case not found");
    return;
  }

  if (note.length === 0 && attachments.length === 0) {
    pluginData.state.common.sendErrorMessage(context, "Text or attachment required");
    return;
  }

  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, note)) {
    return;
  }

  const formattedNote = await formatReasonWithMessageLinkForAttachments(pluginData, note, context, attachments);

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

  pluginData.state.common.sendSuccessMessage(context, `Case \`#${theCase.case_number}\` updated`);
}
