import humanizeDuration from "humanize-duration";
import { getMemberLevel } from "knub/dist/helpers";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import { canActOn, hasPermission, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { resolveMember, resolveUser, stripObjectToScalars } from "../../../utils";
import { banLock } from "../../../utils/lockNameHelpers";
import { waitForButtonConfirm } from "../../../utils/waitForInteraction";
import { banUserId } from "../functions/banUserId";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { isBanned } from "../functions/isBanned";
import { readContactMethodsFromArgs } from "../functions/readContactMethodsFromArgs";
import { modActionsCmd } from "../types";

const opts = {
  mod: ct.member({ option: true }),
  notify: ct.string({ option: true }),
  "notify-channel": ct.textChannel({ option: true }),
  "delete-days": ct.number({ option: true, shortcut: "d" }),
};

export const BanCmd = modActionsCmd({
  trigger: "ban",
  permission: "can_ban",
  description: "Ban or Tempban the specified member",

  signature: [
    {
      user: ct.string(),
      time: ct.delay(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
    {
      user: ct.string(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user);
    if (!user.id) {
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }
    const time = args["time"] ? args["time"] : null;

    const reason = formatReasonWithAttachments(args.reason, msg.attachments.array());
    const memberToBan = await resolveMember(pluginData.client, pluginData.guild, user.id);
    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg, channelId: msg.channel.id }))) {
        sendErrorMessage(pluginData, msg.channel, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
    }

    // acquire a lock because of the needed user-inputs below (if banned/not on server)
    const lock = await pluginData.locks.acquire(banLock(user));
    let forceban = false;
    const existingTempban = await pluginData.state.tempbans.findExistingTempbanForUserId(user.id);
    if (!memberToBan) {
      const banned = await isBanned(pluginData, user.id);
      if (banned) {
        // Abort if trying to ban user indefinitely if they are already banned indefinitely
        if (!existingTempban && !time) {
          sendErrorMessage(pluginData, msg.channel, `User is already banned indefinitely.`);
          return;
        }

        // Ask the mod if we should update the existing ban
        const reply = await waitForButtonConfirm(
          msg.channel,
          { content: "Failed to message the user. Log the warning anyway?" },
          { confirmText: "Yes", cancelText: "No", restrictToId: msg.member.id },
        );
        if (!reply) {
          sendErrorMessage(pluginData, msg.channel, "User already banned, update cancelled by moderator");
          lock.unlock();
          return;
        } else {
          // Update or add new tempban / remove old tempban
          if (time && time > 0) {
            if (existingTempban) {
              pluginData.state.tempbans.updateExpiryTime(user.id, time, mod.id);
            } else {
              pluginData.state.tempbans.addTempban(user.id, time, mod.id);
            }
          } else if (existingTempban) {
            pluginData.state.tempbans.clear(user.id);
          }

          // Create a new case for the updated ban since we never stored the old case id and log the action
          const casesPlugin = pluginData.getPlugin(CasesPlugin);
          const createdCase = await casesPlugin.createCase({
            modId: mod.id,
            type: CaseTypes.Ban,
            userId: user.id,
            reason,
            noteDetails: [`Ban updated to ${time ? humanizeDuration(time) : "indefinite"}`],
          });
          const logtype = time ? LogType.MEMBER_TIMED_BAN : LogType.MEMBER_BAN;
          pluginData.state.serverLogs.log(logtype, {
            mod: stripObjectToScalars(mod.user),
            user: stripObjectToScalars(user),
            caseNumber: createdCase.case_number,
            reason,
            banTime: time ? humanizeDuration(time) : null,
          });

          sendSuccessMessage(
            pluginData,
            msg.channel,
            `Ban updated to ${time ? "expire in " + humanizeDuration(time) + " from now" : "indefinite"}`,
          );
          lock.unlock();
          return;
        }
      } else {
        // Ask the mod if we should upgrade to a forceban as the user is not on the server
        const reply = await waitForButtonConfirm(
          msg.channel,
          { content: "User not on server, forceban instead?" },
          { confirmText: "Yes", cancelText: "No", restrictToId: msg.member.id },
        );
        if (!reply) {
          sendErrorMessage(pluginData, msg.channel, "User not on server, ban cancelled by moderator");
          lock.unlock();
          return;
        } else {
          forceban = true;
        }
      }
    }

    // Make sure we're allowed to ban this member if they are on the server
    if (!forceban && !canActOn(pluginData, msg.member, memberToBan!)) {
      const ourLevel = getMemberLevel(pluginData, msg.member);
      const targetLevel = getMemberLevel(pluginData, memberToBan!);
      sendErrorMessage(
        pluginData,
        msg.channel,
        `Cannot ban: target permission level is equal or higher to yours, ${targetLevel} >= ${ourLevel}`,
      );
      lock.unlock();
      return;
    }

    let contactMethods;
    try {
      contactMethods = readContactMethodsFromArgs(args);
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel, e.message);
      lock.unlock();
      return;
    }

    const deleteMessageDays =
      args["delete-days"] ?? (await pluginData.config.getForMessage(msg)).ban_delete_message_days;
    const banResult = await banUserId(
      pluginData,
      user.id,
      reason,
      {
        contactMethods,
        caseArgs: {
          modId: mod.id,
          ppId: mod.id !== msg.author.id ? msg.author.id : undefined,
        },
        deleteMessageDays,
        modId: mod.id,
      },
      time,
    );

    if (banResult.status === "failed") {
      sendErrorMessage(pluginData, msg.channel, `Failed to ban member: ${banResult.error}`);
      lock.unlock();
      return;
    }

    let forTime = "";
    if (time && time > 0) {
      forTime = `for ${humanizeDuration(time)} `;
    }

    // Confirm the action to the moderator
    let response = "";
    if (!forceban) {
      response = `Banned **${user.username}#${user.discriminator}** ${forTime}(Case #${banResult.case.case_number})`;
      if (banResult.notifyResult.text) response += ` (${banResult.notifyResult.text})`;
    } else {
      response = `Member forcebanned ${forTime}(Case #${banResult.case.case_number})`;
    }

    lock.unlock();
    sendSuccessMessage(pluginData, msg.channel, response);
  },
});
