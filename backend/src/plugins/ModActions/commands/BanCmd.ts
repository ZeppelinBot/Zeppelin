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
    if (!user) return sendErrorMessage(pluginData, msg.channel, `User not found`);

    const memberToBan = await resolveMember(pluginData.client, pluginData.guild, user.id);

    if (!memberToBan) {
      const banned = await isBanned(pluginData, user.id);
      if (banned) {
        sendErrorMessage(pluginData, msg.channel, `User is already banned`);
      } else {
        sendErrorMessage(pluginData, msg.channel, `User not found on the server`);
      }

      return;
    }

    // Make sure we're allowed to ban this member
    if (!canActOn(pluginData, msg.member, memberToBan)) {
      sendErrorMessage(pluginData, msg.channel, "Cannot ban: insufficient permissions");
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
    const banResult = await banUserId(pluginData, memberToBan.id, reason, {
      contactMethods,
      caseArgs: {
        modId: mod.id,
        ppId: mod.id !== msg.author.id ? msg.author.id : null,
      },
      deleteMessageDays,
    });

    if (banResult.status === "failed") {
      sendErrorMessage(pluginData, msg.channel, `Failed to ban member`);
      return;
    }

    // Confirm the action to the moderator
    let response = `Banned **${memberToBan.user.username}#${memberToBan.user.discriminator}** (Case #${banResult.case.case_number})`;

    if (banResult.notifyResult.text) response += ` (${banResult.notifyResult.text})`;
    sendSuccessMessage(pluginData, msg.channel, response);
  },
});
