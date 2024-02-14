import { Attachment, ChatInputCommandInteraction, GuildMember, TextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../../data/LogType";
import { canActOn, sendErrorMessage, sendSuccessMessage } from "../../../../pluginUtils";
import {
  DAYS,
  SECONDS,
  UnknownUser,
  UserNotificationMethod,
  renderUserUsername,
  resolveMember,
} from "../../../../utils";
import { IgnoredEventType, ModActionsPluginType } from "../../types";
import { formatReasonWithAttachments } from "../formatReasonWithAttachments";
import { ignoreEvent } from "../ignoreEvent";
import { isBanned } from "../isBanned";
import { kickMember } from "../kickMember";

export async function actualKickCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: TextBasedChannel | ChatInputCommandInteraction,
  author: GuildMember,
  user: User | UnknownUser,
  reason: string,
  attachments: Attachment[],
  mod: GuildMember,
  contactMethods?: UserNotificationMethod[],
  clean?: boolean,
) {
  const memberToKick = await resolveMember(pluginData.client, pluginData.guild, user.id);

  if (!memberToKick) {
    const banned = await isBanned(pluginData, user.id);
    if (banned) {
      sendErrorMessage(pluginData, context, `User is banned`);
    } else {
      sendErrorMessage(pluginData, context, `User not found on the server`);
    }

    return;
  }

  // Make sure we're allowed to kick this member
  if (!canActOn(pluginData, author, memberToKick)) {
    sendErrorMessage(pluginData, context, "Cannot kick: insufficient permissions");
    return;
  }

  const formattedReason = formatReasonWithAttachments(reason, attachments);

  const kickResult = await kickMember(pluginData, memberToKick, formattedReason, {
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
      sendErrorMessage(pluginData, context, "Failed to ban the user to clean messages (-clean)");
    }

    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, memberToKick.id);
    ignoreEvent(pluginData, IgnoredEventType.Unban, memberToKick.id);

    try {
      await pluginData.guild.bans.remove(memberToKick.id, "kick -clean");
    } catch {
      sendErrorMessage(pluginData, context, "Failed to unban the user after banning them (-clean)");
    }
  }

  if (kickResult.status === "failed") {
    sendErrorMessage(pluginData, context, `Failed to kick user`);
    return;
  }

  // Confirm the action to the moderator
  let response = `Kicked **${renderUserUsername(memberToKick.user)}** (Case #${kickResult.case.case_number})`;

  if (kickResult.notifyResult.text) response += ` (${kickResult.notifyResult.text})`;
  sendSuccessMessage(pluginData, context, response);
}
