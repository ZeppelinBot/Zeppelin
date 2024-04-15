import { Attachment, ChatInputCommandInteraction, Message, User } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../../data/CaseTypes";
import { UnknownUser, renderUsername } from "../../../../utils";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { LogsPlugin } from "../../../Logs/LogsPlugin";
import { ModActionsPluginType } from "../../types";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../../functions/attachmentLinkReaction";
import { formatReasonWithMessageLinkForAttachments } from "../../functions/formatReasonForAttachments";

export async function actualNoteCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  author: User,
  attachments: Array<Attachment>,
  user: User | UnknownUser,
  note: string,
) {
  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, note)) {
    return;
  }

  const userName = renderUsername(user);
  const reason = await formatReasonWithMessageLinkForAttachments(pluginData, note, context, attachments);

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const createdCase = await casesPlugin.createCase({
    userId: user.id,
    modId: author.id,
    type: CaseTypes.Note,
    reason,
  });

  pluginData.getPlugin(LogsPlugin).logMemberNote({
    mod: author,
    user,
    caseNumber: createdCase.case_number,
    reason,
  });

  pluginData.state.common.sendSuccessMessage(
      context,
      `Note added on **${userName}** (Case #${createdCase.case_number})`,
      undefined,
      undefined,
      true,
    );

  pluginData.state.events.emit("note", user.id, reason);
}
