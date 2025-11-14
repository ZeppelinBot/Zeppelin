import { Attachment, ChatInputCommandInteraction, GuildMember, Message, User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../../data/LogType.js";
import { canActOn } from "../../../../pluginUtils.js";
import {
  DAYS,
  SECONDS,
  UnknownUser,
  UserNotificationMethod,
  renderUsername,
  resolveMember,
} from "../../../../utils.js";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../../functions/attachmentLinkReaction.js";
import {
  formatReasonWithAttachments,
  formatReasonWithMessageLinkForAttachments,
} from "../../functions/formatReasonForAttachments.js";
import { ignoreEvent } from "../../functions/ignoreEvent.js";
import { isBanned } from "../../functions/isBanned.js";
import { kickMember } from "../../functions/kickMember.js";
import { IgnoredEventType, ModActionsPluginType } from "../../types.js";

export async function actualKickCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  author: GuildMember,
  user: User | UnknownUser,
  reason: string,
  attachments: Attachment[],
  mod: GuildMember,
  contactMethods?: UserNotificationMethod[],
  clean?: boolean | null,
) {
  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  const memberToKick = await resolveMember(pluginData.client, pluginData.guild, user.id);

  if (!memberToKick) {
    const banned = await isBanned(pluginData, user.id);
    if (banned) {
      pluginData.state.common.sendErrorMessage(context, `User is banned`);
    } else {
      pluginData.state.common.sendErrorMessage(context, `User not found on the server`);
    }

    return;
  }

  // Make sure we're allowed to kick this member
  if (!canActOn(pluginData, author, memberToKick)) {
    pluginData.state.common.sendErrorMessage(context, "Cannot kick: insufficient permissions");
    return;
  }

  const formattedReason = await formatReasonWithMessageLinkForAttachments(pluginData, reason, context, attachments);
  const formattedReasonWithAttachments = formatReasonWithAttachments(reason, attachments);

  const kickResult = await kickMember(pluginData, memberToKick, formattedReason, formattedReasonWithAttachments, {
    contactMethods,
    caseArgs: {
      modId: mod.id,
      ppId: mod.id !== author.id ? author.id : undefined,
    },
  });

  if (clean) {
    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_BAN, memberToKick.id);
    ignoreEvent(pluginData, IgnoredEventType.Ban, memberToKick.id);

    try {
      await memberToKick.ban({ deleteMessageSeconds: (1 * DAYS) / SECONDS, reason: "kick -clean" });
    } catch {
      pluginData.state.common.sendErrorMessage(context, "Failed to ban the user to clean messages (-clean)");
    }

    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, memberToKick.id);
    ignoreEvent(pluginData, IgnoredEventType.Unban, memberToKick.id);

    try {
      await pluginData.guild.bans.remove(memberToKick.id, "kick -clean");
    } catch {
      pluginData.state.common.sendErrorMessage(context, "Failed to unban the user after banning them (-clean)");
    }
  }

  if (kickResult.status === "failed") {
    pluginData.state.common.sendErrorMessage(context, `Failed to kick user`);
    return;
  }

  // Confirm the action to the moderator
  let response = `Kicked **${renderUsername(memberToKick.user)}** (Case #${kickResult.case.case_number})`;

  if (kickResult.notifyResult.text) response += ` (${kickResult.notifyResult.text})`;
  pluginData.state.common.sendSuccessMessage(context, response);
}
