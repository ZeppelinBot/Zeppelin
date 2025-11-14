import { Attachment, ChatInputCommandInteraction, GuildMember, Message, Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { CaseTypes } from "../../../../data/CaseTypes.js";
import { LogType } from "../../../../data/LogType.js";
import { deleteContextResponse, isContextInteraction, sendContextResponse } from "../../../../pluginUtils.js";
import { MINUTES, noop } from "../../../../utils.js";
import { CasesPlugin } from "../../../Cases/CasesPlugin.js";
import { LogsPlugin } from "../../../Logs/LogsPlugin.js";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../../functions/attachmentLinkReaction.js";
import { formatReasonWithMessageLinkForAttachments } from "../../functions/formatReasonForAttachments.js";
import { ignoreEvent } from "../../functions/ignoreEvent.js";
import { isBanned } from "../../functions/isBanned.js";
import { IgnoredEventType, ModActionsPluginType } from "../../types.js";

export async function actualMassUnbanCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  userIds: string[],
  author: GuildMember,
  reason: string,
  attachments: Attachment[],
) {
  // Limit to 100 users at once (arbitrary?)
  if (userIds.length > 100) {
    pluginData.state.common.sendErrorMessage(context, `Can only mass-unban max 100 users at once`);
    return;
  }

  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  const unbanReason = await formatReasonWithMessageLinkForAttachments(pluginData, reason, context, attachments);

  // Ignore automatic unban cases and logs for these users
  // We'll create our own cases below and post a single "mass unbanned" log instead
  userIds.forEach((userId) => {
    // Use longer timeouts since this can take a while
    ignoreEvent(pluginData, IgnoredEventType.Unban, userId, 2 * MINUTES);
    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, userId, 2 * MINUTES);
  });

  // Show a loading indicator since this can take a while
  const loadingMsg = await sendContextResponse(context, { content: "Unbanning...", ephemeral: true });

  // Unban each user and count failed unbans (if any)
  const failedUnbans: Array<{ userId: string; reason: UnbanFailReasons }> = [];
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  for (const userId of userIds) {
    if (!(await isBanned(pluginData, userId))) {
      failedUnbans.push({ userId, reason: UnbanFailReasons.NOT_BANNED });
      continue;
    }

    try {
      await pluginData.guild.bans.remove(userId as Snowflake, unbanReason ?? undefined);

      await casesPlugin.createCase({
        userId,
        modId: author.id,
        type: CaseTypes.Unban,
        reason: `Mass unban: ${unbanReason}`,
        postInCaseLogOverride: false,
      });
    } catch {
      failedUnbans.push({ userId, reason: UnbanFailReasons.UNBAN_FAILED });
    }
  }

  if (!isContextInteraction(context)) {
    // Clear loading indicator
    await deleteContextResponse(loadingMsg).catch(noop);
  }

  const successfulUnbanCount = userIds.length - failedUnbans.length;
  if (successfulUnbanCount === 0) {
    // All unbans failed - don't create a log entry and notify the user
    pluginData.state.common.sendErrorMessage(context, "All unbans failed. Make sure the IDs are valid and banned.");
  } else {
    // Some or all unbans were successful. Create a log entry for the mass unban and notify the user.
    pluginData.getPlugin(LogsPlugin).logMassUnban({
      mod: author.user,
      count: successfulUnbanCount,
      reason: unbanReason,
    });

    if (failedUnbans.length) {
      const notBanned = failedUnbans.filter((x) => x.reason === UnbanFailReasons.NOT_BANNED);
      const unbanFailed = failedUnbans.filter((x) => x.reason === UnbanFailReasons.UNBAN_FAILED);

      let failedMsg = "";
      if (notBanned.length > 0) {
        failedMsg += `${notBanned.length}x ${UnbanFailReasons.NOT_BANNED}:`;
        notBanned.forEach((fail) => {
          failedMsg += " " + fail.userId;
        });
      }
      if (unbanFailed.length > 0) {
        failedMsg += `\n${unbanFailed.length}x ${UnbanFailReasons.UNBAN_FAILED}:`;
        unbanFailed.forEach((fail) => {
          failedMsg += " " + fail.userId;
        });
      }

      pluginData.state.common.sendSuccessMessage(
        context,
        `Unbanned ${successfulUnbanCount} users, ${failedUnbans.length} failed:\n${failedMsg}`,
      );
    } else {
      pluginData.state.common.sendSuccessMessage(context, `Unbanned ${successfulUnbanCount} users successfully`);
    }
  }
}

enum UnbanFailReasons {
  NOT_BANNED = "Not banned",
  UNBAN_FAILED = "Unban failed",
}
