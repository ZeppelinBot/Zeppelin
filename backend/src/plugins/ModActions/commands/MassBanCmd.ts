import { Snowflake, TextChannel } from "discord.js";
import { waitForReply } from "knub/dist/helpers";
import { performance } from "perf_hooks";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";
import { humanizeDurationShort } from "../../../humanizeDurationShort";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import { canActOn, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { MINUTES, noop, stripObjectToScalars } from "../../../utils";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { ignoreEvent } from "../functions/ignoreEvent";
import { IgnoredEventType, modActionsCmd } from "../types";

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
    msg.channel.send("Ban reason? `cancel` to cancel");
    const banReasonReply = await waitForReply(pluginData.client, msg.channel as TextChannel, msg.author.id);
    if (!banReasonReply || !banReasonReply.content || banReasonReply.content.toLowerCase().trim() === "cancel") {
      sendErrorMessage(pluginData, msg.channel, "Cancelled");
      return;
    }

    const banReason = formatReasonWithAttachments(banReasonReply.content, msg.attachments.array());

    // Verify we can act on each of the users specified
    for (const userId of args.userIds) {
      const member = pluginData.guild.members.cache.get(userId as Snowflake); // TODO: Get members on demand?
      if (member && !canActOn(pluginData, msg.member, member)) {
        sendErrorMessage(pluginData, msg.channel, "Cannot massban one or more users: insufficient permissions");
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
    const loadingMsg = await msg.channel.send(initialLoadingText);

    const waitTimeStart = performance.now();
    const waitingInterval = setInterval(() => {
      const waitTime = humanizeDurationShort(performance.now() - waitTimeStart, { round: true });
      loadingMsg
        .edit(`Massban queued. Still waiting for previous massban to finish (waited ${waitTime}).`)
        .catch(() => clearInterval(waitingInterval));
    }, 1 * MINUTES);

    pluginData.state.massbanQueue.add(async () => {
      clearInterval(waitingInterval);

      if (pluginData.state.unloaded) {
        void loadingMsg.delete().catch(noop);
        return;
      }

      void loadingMsg.edit("Banning...").catch(noop);

      // Ban each user and count failed bans (if any)
      const startTime = performance.now();
      const failedBans: string[] = [];
      const casesPlugin = pluginData.getPlugin(CasesPlugin);
      for (const [i, userId] of args.userIds.entries()) {
        if (pluginData.state.unloaded) {
          break;
        }

        try {
          // Ignore automatic ban cases and logs
          // We create our own cases below and post a single "mass banned" log instead
          ignoreEvent(pluginData, IgnoredEventType.Ban, userId, 120 * 1000);
          pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_BAN, userId, 120 * 1000);

          await pluginData.guild.bans.create(userId as Snowflake, {
            days: 1,
            reason: banReason != null ? encodeURIComponent(banReason) : undefined,
          });

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

        // Send a status update every 10 bans
        if ((i + 1) % 10 === 0) {
          loadingMsg.edit(`Banning... ${i + 1}/${args.userIds.length}`).catch(noop);
        }
      }

      const totalTime = performance.now() - startTime;
      const formattedTimeTaken = humanizeDurationShort(totalTime, { round: true });

      // Clear loading indicator
      loadingMsg.delete().catch(noop);

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
            `Banned ${successfulBanCount} users in ${formattedTimeTaken}, ${
              failedBans.length
            } failed: ${failedBans.join(" ")}`,
          );
        } else {
          sendSuccessMessage(
            pluginData,
            msg.channel,
            `Banned ${successfulBanCount} users successfully in ${formattedTimeTaken}`,
          );
        }
      }
    });
  },
});
