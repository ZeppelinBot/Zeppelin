import { modActionsCmd, IgnoredEventType } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn, sendErrorMessage, hasPermission, sendSuccessMessage } from "../../../pluginUtils";
import { resolveUser, resolveMember } from "../../../utils";
import { isBanned } from "../functions/isBanned";
import { readContactMethodsFromArgs } from "../functions/readContactMethodsFromArgs";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { banUserId } from "../functions/banUserId";
import { ignoreEvent } from "../functions/ignoreEvent";
import { LogType } from "../../../data/LogType";
import { getMemberLevel, waitForReaction } from "knub/dist/helpers";

const opts = {
  mod: ct.member({ option: true }),
  notify: ct.string({ option: true }),
  "notify-channel": ct.textChannel({ option: true }),
  "delete-days": ct.number({ option: true, shortcut: "d" }),
};

export const BanCmd = modActionsCmd({
  trigger: "ban",
  permission: "can_ban",
  description: "Ban the specified member",

  signature: [
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

    const memberToBan = await resolveMember(pluginData.client, pluginData.guild, user.id);

    let forceban = false;
    if (!memberToBan) {
      const banned = await isBanned(pluginData, user.id);

      if (banned) {
        sendErrorMessage(pluginData, msg.channel, `User is already banned`);
        return;
      } else {
        // Ask the mod if we should upgrade to a forceban as the user is not on the server
        const notOnServerMsg = await msg.channel.createMessage("User not found on the server, forceban instead?");
        const reply = await waitForReaction(pluginData.client, notOnServerMsg, ["✅", "❌"], msg.author.id);

        notOnServerMsg.delete();
        if (!reply || reply.name === "❌") {
          sendErrorMessage(pluginData, msg.channel, "User not on server, ban cancelled by moderator");
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
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!hasPermission(pluginData, "can_act_as_other", { message: msg, channelId: msg.channel.id })) {
        sendErrorMessage(pluginData, msg.channel, "No permission for -mod");
        return;
      }

      mod = args.mod;
    }

    let contactMethods;
    try {
      contactMethods = readContactMethodsFromArgs(args);
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel, e.message);
      return;
    }

    const deleteMessageDays = args["delete-days"] ?? pluginData.config.getForMessage(msg).ban_delete_message_days;
    const reason = formatReasonWithAttachments(args.reason, msg.attachments);
    const banResult = await banUserId(pluginData, user.id, reason, {
      contactMethods,
      caseArgs: {
        modId: mod.id,
        ppId: mod.id !== msg.author.id ? msg.author.id : undefined,
      },
      deleteMessageDays,
    });

    if (banResult.status === "failed") {
      sendErrorMessage(pluginData, msg.channel, `Failed to ban member: ${banResult.error}`);
      return;
    }

    // Confirm the action to the moderator
    let response = "";
    if (!forceban) {
      response = `Banned **${user.username}#${user.discriminator}** (Case #${banResult.case.case_number})`;
      if (banResult.notifyResult.text) response += ` (${banResult.notifyResult.text})`;
    } else {
      response = `Member forcebanned (Case #${banResult.case.case_number})`;
    }

    sendSuccessMessage(pluginData, msg.channel, response);
  },
});
