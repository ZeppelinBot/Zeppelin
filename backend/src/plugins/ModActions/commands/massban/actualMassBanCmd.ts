import { Attachment, ChatInputCommandInteraction, GuildMember, Message, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../../data/CaseTypes";
import { LogType } from "../../../../data/LogType";
import { humanizeDurationShort } from "../../../../humanizeDurationShort";
import { canActOn, getContextChannel, isContextInteraction, sendContextResponse } from "../../../../pluginUtils";
import { DAYS, MINUTES, SECONDS, noop } from "../../../../utils";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { LogsPlugin } from "../../../Logs/LogsPlugin";
import { IgnoredEventType, ModActionsPluginType } from "../../types";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../../functions/attachmentLinkReaction";
import { formatReasonWithAttachments, formatReasonWithMessageLinkForAttachments } from "../../functions/formatReasonForAttachments";
import { ignoreEvent } from "../../functions/ignoreEvent";

export async function actualMassBanCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  userIds: string[],
  author: GuildMember,
  reason: string,
  attachments: Attachment[],
) {
  // Limit to 100 users at once (arbitrary?)
  if (userIds.length > 100) {
    pluginData.state.common.sendErrorMessage(context, `Can only massban max 100 users at once`);
    return;
  }

  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  const banReason = await formatReasonWithMessageLinkForAttachments(pluginData, reason, context, attachments);
  const banReasonWithAttachments = formatReasonWithAttachments(reason, attachments);

  // Verify we can act on each of the users specified
  for (const userId of userIds) {
    const member = pluginData.guild.members.cache.get(userId as Snowflake); // TODO: Get members on demand?
    if (member && !canActOn(pluginData, author, member)) {
      pluginData.state.common.sendErrorMessage(
        context,
        "Cannot massban one or more users: insufficient permissions");
      return;
    }
  }

  // Show a loading indicator since this can take a while
  const maxWaitTime = pluginData.state.massbanQueue.timeout * pluginData.state.massbanQueue.length;
  const maxWaitTimeFormatted = humanizeDurationShort(maxWaitTime, { round: true });
  const initialLoadingText =
    pluginData.state.massbanQueue.length === 0
      ? "Banning..."
      : `Massban queued. Waiting for previous massban to finish (max wait ${maxWaitTimeFormatted}).`;
  const loadingMsg = await sendContextResponse(context, { content: initialLoadingText, ephemeral: true });

  const waitTimeStart = performance.now();
  const waitingInterval = setInterval(() => {
    const waitTime = humanizeDurationShort(performance.now() - waitTimeStart, { round: true });
    const waitMessageContent = `Massban queued. Still waiting for previous massban to finish (waited ${waitTime}).`;

    if (isContextInteraction(context)) {
      context.editReply(waitMessageContent).catch(() => clearInterval(waitingInterval));
    } else {
      loadingMsg.edit(waitMessageContent).catch(() => clearInterval(waitingInterval));
    }
  }, 1 * MINUTES);

  pluginData.state.massbanQueue.add(async () => {
    clearInterval(waitingInterval);

    if (pluginData.state.unloaded) {
      if (isContextInteraction(context)) {
        void context.deleteReply().catch(noop);
      } else {
        void loadingMsg.delete().catch(noop);
      }

      return;
    }

    if (isContextInteraction(context)) {
      void context.editReply("Banning...").catch(noop);
    } else {
      void loadingMsg.edit("Banning...").catch(noop);
    }

    // Ban each user and count failed bans (if any)
    const startTime = performance.now();
    const failedBans: string[] = [];
    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    const messageConfig = isContextInteraction(context)
      ? await pluginData.config.getForInteraction(context)
      : await pluginData.config.getForChannel(await getContextChannel(context));
    const deleteDays = messageConfig.ban_delete_message_days;

    for (const [i, userId] of userIds.entries()) {
      if (pluginData.state.unloaded) {
        break;
      }

      try {
        // Ignore automatic ban cases and logs
        // We create our own cases below and post a single "mass banned" log instead
        ignoreEvent(pluginData, IgnoredEventType.Ban, userId, 30 * MINUTES);
        pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_BAN, userId, 30 * MINUTES);

        await pluginData.guild.bans.create(userId as Snowflake, {
          deleteMessageSeconds: (deleteDays * DAYS) / SECONDS,
          reason: banReasonWithAttachments,
        });

        await casesPlugin.createCase({
          userId,
          modId: author.id,
          type: CaseTypes.Ban,
          reason: `Mass ban: ${banReason}`,
          postInCaseLogOverride: false,
        });

        pluginData.state.events.emit("ban", userId, banReason);
      } catch {
        failedBans.push(userId);
      }

      // Send a status update every 10 bans
      if ((i + 1) % 10 === 0) {
        const newLoadingMessageContent = `Banning... ${i + 1}/${userIds.length}`;

        if (isContextInteraction(context)) {
          void context.editReply(newLoadingMessageContent).catch(noop);
        } else {
          loadingMsg.edit(newLoadingMessageContent).catch(noop);
        }
      }
    }

    const totalTime = performance.now() - startTime;
    const formattedTimeTaken = humanizeDurationShort(totalTime, { round: true });

    if (!isContextInteraction(context)) {
      // Clear loading indicator
      loadingMsg.delete().catch(noop);
    }

    const successfulBanCount = userIds.length - failedBans.length;
    if (successfulBanCount === 0) {
      // All bans failed - don't create a log entry and notify the user
      pluginData.state.common.sendErrorMessage(context, "All bans failed. Make sure the IDs are valid.");
    } else {
      // Some or all bans were successful. Create a log entry for the mass ban and notify the user.
      pluginData.getPlugin(LogsPlugin).logMassBan({
        mod: author.user,
        count: successfulBanCount,
        reason: banReason,
      });

      if (failedBans.length) {
        pluginData.state.common.sendSuccessMessage(
          context,
          `Banned ${successfulBanCount} users in ${formattedTimeTaken}, ${
            failedBans.length
          } failed: ${failedBans.join(" ")}`,
        );
      } else {
        pluginData.state.common.sendSuccessMessage(
          context,
          `Banned ${successfulBanCount} users successfully in ${formattedTimeTaken}`
        );
      }
    }
  });
}
