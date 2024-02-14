import { ChatInputCommandInteraction, GuildMember, Snowflake, TextBasedChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { waitForReply } from "knub/helpers";
import { LogType } from "../../../../data/LogType";
import { logger } from "../../../../logger";
import {
  canActOn,
  isContextInteraction,
  sendContextResponse,
  sendErrorMessage,
  sendSuccessMessage,
} from "../../../../pluginUtils";
import { LogsPlugin } from "../../../Logs/LogsPlugin";
import { MutesPlugin } from "../../../Mutes/MutesPlugin";
import { ModActionsPluginType } from "../../types";
import { formatReasonWithAttachments } from "../formatReasonWithAttachments";

export async function actualMassMuteCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: TextBasedChannel | ChatInputCommandInteraction,
  userIds: string[],
  author: GuildMember,
) {
  // Limit to 100 users at once (arbitrary?)
  if (userIds.length > 100) {
    sendErrorMessage(pluginData, context, `Can only massmute max 100 users at once`);
    return;
  }

  // Ask for mute reason
  sendContextResponse(context, "Mute reason? `cancel` to cancel");
  const muteReasonReceived = await waitForReply(
    pluginData.client,
    isContextInteraction(context) ? context.channel! : context,
    author.id,
  );
  if (
    !muteReasonReceived ||
    !muteReasonReceived.content ||
    muteReasonReceived.content.toLowerCase().trim() === "cancel"
  ) {
    sendErrorMessage(pluginData, context, "Cancelled");
    return;
  }

  const muteReason = formatReasonWithAttachments(muteReasonReceived.content, [
    ...muteReasonReceived.attachments.values(),
  ]);

  // Verify we can act upon all users
  for (const userId of userIds) {
    const member = pluginData.guild.members.cache.get(userId as Snowflake);
    if (member && !canActOn(pluginData, author, member)) {
      sendErrorMessage(pluginData, context, "Cannot massmute one or more users: insufficient permissions");
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
  const loadingMsg = await sendContextResponse(context, "Muting...");

  // Mute everyone and count fails
  const modId = author.id;
  const failedMutes: string[] = [];
  const mutesPlugin = pluginData.getPlugin(MutesPlugin);
  for (const userId of userIds) {
    try {
      await mutesPlugin.muteUser(userId, 0, `Mass mute: ${muteReason}`, {
        caseArgs: {
          modId,
        },
      });
    } catch (e) {
      logger.info(e);
      failedMutes.push(userId);
    }
  }

  // Clear loading indicator
  loadingMsg.delete();

  const successfulMuteCount = userIds.length - failedMutes.length;
  if (successfulMuteCount === 0) {
    // All mutes failed
    sendErrorMessage(pluginData, context, "All mutes failed. Make sure the IDs are valid.");
  } else {
    // Success on all or some mutes
    pluginData.getPlugin(LogsPlugin).logMassMute({
      mod: author.user,
      count: successfulMuteCount,
    });

    if (failedMutes.length) {
      sendSuccessMessage(
        pluginData,
        context,
        `Muted ${successfulMuteCount} users, ${failedMutes.length} failed: ${failedMutes.join(" ")}`,
      );
    } else {
      sendSuccessMessage(pluginData, context, `Muted ${successfulMuteCount} users successfully`);
    }
  }
}
