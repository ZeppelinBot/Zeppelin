import { Attachment, ChatInputCommandInteraction, GuildMember, Message, User } from "discord.js";
import { GuildPluginData } from "vety";
import { CaseTypes } from "../../../../data/CaseTypes.js";
import { Case } from "../../../../data/entities/Case.js";
import { canActOn } from "../../../../pluginUtils.js";
import { UnknownUser, renderUsername, resolveMember } from "../../../../utils.js";
import { CasesPlugin } from "../../../Cases/CasesPlugin.js";
import { LogsPlugin } from "../../../Logs/LogsPlugin.js";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../../functions/attachmentLinkReaction.js";
import { formatReasonWithMessageLinkForAttachments } from "../../functions/formatReasonForAttachments.js";
import { ModActionsPluginType } from "../../types.js";

export async function actualAddCaseCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  author: GuildMember,
  mod: GuildMember,
  attachments: Array<Attachment>,
  user: User | UnknownUser,
  type: keyof CaseTypes,
  reason: string,
) {
  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  // If the user exists as a guild member, make sure we can act on them first
  const member = await resolveMember(pluginData.client, pluginData.guild, user.id);
  if (member && !canActOn(pluginData, author, member)) {
    pluginData.state.common.sendErrorMessage(context, "Cannot add case on this user: insufficient permissions");
    return;
  }

  const formattedReason = await formatReasonWithMessageLinkForAttachments(pluginData, reason, context, attachments);

  // Create the case
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const theCase: Case = await casesPlugin.createCase({
    userId: user.id,
    modId: mod.id,
    type: CaseTypes[type],
    reason: formattedReason,
    ppId: mod.id !== author.id ? author.id : undefined,
  });

  if (user) {
    pluginData.state.common.sendSuccessMessage(
      context,
      `Case #${theCase.case_number} created for **${renderUsername(user)}**`,
    );
  } else {
    pluginData.state.common.sendSuccessMessage(context, `Case #${theCase.case_number} created`);
  }

  // Log the action
  pluginData.getPlugin(LogsPlugin).logCaseCreate({
    mod: mod.user,
    userId: user.id,
    caseNum: theCase.case_number,
    caseType: type.toUpperCase(),
    reason: formattedReason,
  });
}
