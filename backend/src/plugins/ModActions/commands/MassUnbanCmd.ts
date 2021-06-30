import { Snowflake, TextChannel } from "discord.js";
import { waitForReply } from "knub/dist/helpers";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { stripObjectToScalars } from "../../../utils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { ignoreEvent } from "../functions/ignoreEvent";
import { isBanned } from "../functions/isBanned";
import { IgnoredEventType, modActionsCmd } from "../types";

export const MassunbanCmd = modActionsCmd({
  trigger: "massunban",
  permission: "can_massunban",
  description: "Mass-unban a list of user IDs",

  signature: [
    {
      userIds: ct.string({ rest: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    // Limit to 100 users at once (arbitrary?)
    if (args.userIds.length > 100) {
      sendErrorMessage(pluginData, msg.channel, `Can only mass-unban max 100 users at once`);
      return;
    }

    // Ask for unban reason (cleaner this way instead of trying to cram it into the args)
    msg.channel.send("Unban reason? `cancel` to cancel");
    const unbanReasonReply = await waitForReply(pluginData.client, msg.channel as TextChannel, msg.author.id);
    if (!unbanReasonReply || !unbanReasonReply.content || unbanReasonReply.content.toLowerCase().trim() === "cancel") {
      sendErrorMessage(pluginData, msg.channel, "Cancelled");
      return;
    }

    const unbanReason = formatReasonWithAttachments(unbanReasonReply.content, msg.attachments.array());

    // Ignore automatic unban cases and logs for these users
    // We'll create our own cases below and post a single "mass unbanned" log instead
    args.userIds.forEach(userId => {
      // Use longer timeouts since this can take a while
      ignoreEvent(pluginData, IgnoredEventType.Unban, userId, 120 * 1000);
      pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, userId, 120 * 1000);
    });

    // Show a loading indicator since this can take a while
    const loadingMsg = await msg.channel.send("Unbanning...");

    // Unban each user and count failed unbans (if any)
    const failedUnbans: Array<{ userId: string; reason: UnbanFailReasons }> = [];
    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    for (const userId of args.userIds) {
      if (!(await isBanned(pluginData, userId))) {
        failedUnbans.push({ userId, reason: UnbanFailReasons.NOT_BANNED });
        continue;
      }

      try {
        await pluginData.guild.bans.remove(
          userId as Snowflake,
          unbanReason != null ? encodeURIComponent(unbanReason) : undefined,
        );

        await casesPlugin.createCase({
          userId,
          modId: msg.author.id,
          type: CaseTypes.Unban,
          reason: `Mass unban: ${unbanReason}`,
          postInCaseLogOverride: false,
        });
      } catch {
        failedUnbans.push({ userId, reason: UnbanFailReasons.UNBAN_FAILED });
      }
    }

    // Clear loading indicator
    loadingMsg.delete();

    const successfulUnbanCount = args.userIds.length - failedUnbans.length;
    if (successfulUnbanCount === 0) {
      // All unbans failed - don't create a log entry and notify the user
      sendErrorMessage(pluginData, msg.channel, "All unbans failed. Make sure the IDs are valid and banned.");
    } else {
      // Some or all unbans were successful. Create a log entry for the mass unban and notify the user.
      pluginData.state.serverLogs.log(LogType.MASSUNBAN, {
        mod: stripObjectToScalars(msg.author),
        count: successfulUnbanCount,
        reason: unbanReason,
      });

      if (failedUnbans.length) {
        const notBanned = failedUnbans.filter(x => x.reason === UnbanFailReasons.NOT_BANNED);
        const unbanFailed = failedUnbans.filter(x => x.reason === UnbanFailReasons.UNBAN_FAILED);

        let failedMsg = "";
        if (notBanned.length > 0) {
          failedMsg += `${notBanned.length}x ${UnbanFailReasons.NOT_BANNED}:`;
          notBanned.forEach(fail => {
            failedMsg += " " + fail.userId;
          });
        }
        if (unbanFailed.length > 0) {
          failedMsg += `\n${unbanFailed.length}x ${UnbanFailReasons.UNBAN_FAILED}:`;
          unbanFailed.forEach(fail => {
            failedMsg += " " + fail.userId;
          });
        }

        sendSuccessMessage(
          pluginData,
          msg.channel,
          `Unbanned ${successfulUnbanCount} users, ${failedUnbans.length} failed:\n${failedMsg}`,
        );
      } else {
        sendSuccessMessage(pluginData, msg.channel, `Unbanned ${successfulUnbanCount} users successfully`);
      }
    }
  },
});

enum UnbanFailReasons {
  NOT_BANNED = "Not banned",
  UNBAN_FAILED = "Unban failed",
}
