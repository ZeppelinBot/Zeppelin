import { Snowflake, TextChannel } from "discord.js";
import { waitForReply } from "knub/dist/helpers";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { LogType } from "../../../data/LogType";
import { logger } from "../../../logger";
import { MutesPlugin } from "../../../plugins/Mutes/MutesPlugin";
import { canActOn, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { stripObjectToScalars } from "../../../utils";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { modActionsCmd } from "../types";

export const MassmuteCmd = modActionsCmd({
  trigger: "massmute",
  permission: "can_massmute",
  description: "Mass-mute a list of user IDs",

  signature: [
    {
      userIds: ct.string({ rest: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    // Limit to 100 users at once (arbitrary?)
    if (args.userIds.length > 100) {
      sendErrorMessage(pluginData, msg.channel, `Can only massmute max 100 users at once`);
      return;
    }

    // Ask for mute reason
    msg.channel.send("Mute reason? `cancel` to cancel");
    const muteReasonReceived = await waitForReply(pluginData.client, msg.channel as TextChannel, msg.author.id);
    if (
      !muteReasonReceived ||
      !muteReasonReceived.content ||
      muteReasonReceived.content.toLowerCase().trim() === "cancel"
    ) {
      sendErrorMessage(pluginData, msg.channel, "Cancelled");
      return;
    }

    const muteReason = formatReasonWithAttachments(muteReasonReceived.content, msg.attachments.array());

    // Verify we can act upon all users
    for (const userId of args.userIds) {
      const member = pluginData.guild.members.cache.get(userId as Snowflake);
      if (member && !canActOn(pluginData, msg.member, member)) {
        sendErrorMessage(pluginData, msg.channel, "Cannot massmute one or more users: insufficient permissions");
        return;
      }
    }

    // Ignore automatic mute cases and logs for these users
    // We'll create our own cases below and post a single "mass muted" log instead
    args.userIds.forEach(userId => {
      // Use longer timeouts since this can take a while
      pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_MUTE, userId, 120 * 1000);
    });

    // Show loading indicator
    const loadingMsg = await msg.channel.send("Muting...");

    // Mute everyone and count fails
    const modId = msg.author.id;
    const failedMutes: string[] = [];
    const mutesPlugin = pluginData.getPlugin(MutesPlugin);
    for (const userId of args.userIds) {
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

    const successfulMuteCount = args.userIds.length - failedMutes.length;
    if (successfulMuteCount === 0) {
      // All mutes failed
      sendErrorMessage(pluginData, msg.channel, "All mutes failed. Make sure the IDs are valid.");
    } else {
      // Success on all or some mutes
      pluginData.state.serverLogs.log(LogType.MASSMUTE, {
        mod: stripObjectToScalars(msg.author),
        count: successfulMuteCount,
      });

      if (failedMutes.length) {
        sendSuccessMessage(
          pluginData,
          msg.channel,
          `Muted ${successfulMuteCount} users, ${failedMutes.length} failed: ${failedMutes.join(" ")}`,
        );
      } else {
        sendSuccessMessage(pluginData, msg.channel, `Muted ${successfulMuteCount} users successfully`);
      }
    }
  },
});
