import { Attachment, ChatInputCommandInteraction, GuildMember, Message, Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../../data/LogType.js";
import { logger } from "../../../../logger.js";
import { canActOn, deleteContextResponse, isContextInteraction, sendContextResponse } from "../../../../pluginUtils.js";
import { noop } from "../../../../utils.js";
import { LogsPlugin } from "../../../Logs/LogsPlugin.js";
import { MutesPlugin } from "../../../Mutes/MutesPlugin.js";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../../functions/attachmentLinkReaction.js";
import {
  formatReasonWithAttachments,
  formatReasonWithMessageLinkForAttachments,
} from "../../functions/formatReasonForAttachments.js";
import { ModActionsPluginType } from "../../types.js";

export async function actualMassMuteCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  userIds: string[],
  author: GuildMember,
  reason: string,
  attachments: Attachment[],
) {
  // Limit to 100 users at once (arbitrary?)
  if (userIds.length > 100) {
    pluginData.state.common.sendErrorMessage(context, `Can only massmute max 100 users at once`);
    return;
  }

  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  const muteReason = await formatReasonWithMessageLinkForAttachments(pluginData, reason, context, attachments);
  const muteReasonWithAttachments = formatReasonWithAttachments(reason, attachments);

  // Verify we can act upon all users
  for (const userId of userIds) {
    const member = pluginData.guild.members.cache.get(userId as Snowflake);
    if (member && !canActOn(pluginData, author, member)) {
      pluginData.state.common.sendErrorMessage(context, "Cannot massmute one or more users: insufficient permissions");
      return;
    }
  }

  // Ignore automatic mute cases and logs for these users
  // We'll create our own cases below and post a single "mass muted" log instead
  userIds.forEach((userId) => {
    // Use longer timeouts since this can take a while
    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_MUTE, userId, 120 * 1000);
  });

  // Show loading indicator
  const loadingMsg = await sendContextResponse(context, "Muting...", true);

  // Mute everyone and count fails
  const modId = author.id;
  const failedMutes: string[] = [];
  const mutesPlugin = pluginData.getPlugin(MutesPlugin);
  for (const userId of userIds) {
    try {
      await mutesPlugin.muteUser(userId, 0, `Mass mute: ${muteReason}`, `Mass mute: ${muteReasonWithAttachments}`, {
        caseArgs: {
          modId,
        },
      });
    } catch (e) {
      logger.info(e);
      failedMutes.push(userId);
    }
  }

  if (!isContextInteraction(context)) {
    // Clear loading indicator
    deleteContextResponse(loadingMsg).catch(noop);
  }

  const successfulMuteCount = userIds.length - failedMutes.length;
  if (successfulMuteCount === 0) {
    // All mutes failed
    pluginData.state.common.sendErrorMessage(context, "All mutes failed. Make sure the IDs are valid.");
  } else {
    // Success on all or some mutes
    pluginData.getPlugin(LogsPlugin).logMassMute({
      mod: author.user,
      count: successfulMuteCount,
    });

    if (failedMutes.length) {
      pluginData.state.common.sendSuccessMessage(
        context,
        `Muted ${successfulMuteCount} users, ${failedMutes.length} failed: ${failedMutes.join(" ")}`,
      );
    } else {
      pluginData.state.common.sendSuccessMessage(context, `Muted ${successfulMuteCount} users successfully`);
    }
  }
}
