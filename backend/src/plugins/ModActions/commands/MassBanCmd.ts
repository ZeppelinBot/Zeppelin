import { modActionsCmd, IgnoredEventType } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn, sendErrorMessage, hasPermission, sendSuccessMessage } from "../../../pluginUtils";
import { resolveUser, resolveMember, stripObjectToScalars } from "../../../utils";
import { isBanned } from "../functions/isBanned";
import { readContactMethodsFromArgs } from "../functions/readContactMethodsFromArgs";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { banUserId } from "../functions/banUserId";
import { CaseTypes } from "../../../data/CaseTypes";
import { TextChannel } from "eris";
import { waitForReply } from "knub/dist/helpers";
import { ignoreEvent } from "../functions/ignoreEvent";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import { LogType } from "../../../data/LogType";

export const MassbanCmd = modActionsCmd({
  trigger: "massban",
  permission: "can_massban",
  description: "Mass-ban a list of user IDs",

  signature: [
    {
      userIds: ct.string({ rest: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    // Limit to 100 users at once (arbitrary?)
    if (args.userIds.length > 100) {
      sendErrorMessage(pluginData, msg.channel, `Can only massban max 100 users at once`);
      return;
    }

    // Ask for ban reason (cleaner this way instead of trying to cram it into the args)
    msg.channel.createMessage("Ban reason? `cancel` to cancel");
    const banReasonReply = await waitForReply(pluginData.client, msg.channel as TextChannel, msg.author.id);
    if (!banReasonReply || !banReasonReply.content || banReasonReply.content.toLowerCase().trim() === "cancel") {
      sendErrorMessage(pluginData, msg.channel, "Cancelled");
      return;
    }

    const banReason = formatReasonWithAttachments(banReasonReply.content, msg.attachments);

    // Verify we can act on each of the users specified
    for (const userId of args.userIds) {
      const member = pluginData.guild.members.get(userId); // TODO: Get members on demand?
      if (member && !canActOn(pluginData, msg.member, member)) {
        sendErrorMessage(pluginData, msg.channel, "Cannot massban one or more users: insufficient permissions");
        return;
      }
    }

    // Ignore automatic ban cases and logs for these users
    // We'll create our own cases below and post a single "mass banned" log instead
    args.userIds.forEach(userId => {
      // Use longer timeouts since this can take a while
      ignoreEvent(pluginData, IgnoredEventType.Ban, userId, 120 * 1000);
      pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_BAN, userId, 120 * 1000);
    });

    // Show a loading indicator since this can take a while
    const loadingMsg = await msg.channel.createMessage("Banning...");

    // Ban each user and count failed bans (if any)
    const failedBans: string[] = [];
    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    for (const userId of args.userIds) {
      try {
        await pluginData.guild.banMember(userId, 1, banReason != null ? encodeURIComponent(banReason) : undefined);

        await casesPlugin.createCase({
          userId,
          modId: msg.author.id,
          type: CaseTypes.Ban,
          reason: `Mass ban: ${banReason}`,
          postInCaseLogOverride: false,
        });

        pluginData.state.events.emit("ban", userId, banReason);
      } catch {
        failedBans.push(userId);
      }
    }

    // Clear loading indicator
    loadingMsg.delete();

    const successfulBanCount = args.userIds.length - failedBans.length;
    if (successfulBanCount === 0) {
      // All bans failed - don't create a log entry and notify the user
      sendErrorMessage(pluginData, msg.channel, "All bans failed. Make sure the IDs are valid.");
    } else {
      // Some or all bans were successful. Create a log entry for the mass ban and notify the user.
      pluginData.state.serverLogs.log(LogType.MASSBAN, {
        mod: stripObjectToScalars(msg.author),
        count: successfulBanCount,
        reason: banReason,
      });

      if (failedBans.length) {
        sendSuccessMessage(
          pluginData,
          msg.channel,
          `Banned ${successfulBanCount} users, ${failedBans.length} failed: ${failedBans.join(" ")}`,
        );
      } else {
        sendSuccessMessage(pluginData, msg.channel, `Banned ${successfulBanCount} users successfully`);
      }
    }
  },
});
