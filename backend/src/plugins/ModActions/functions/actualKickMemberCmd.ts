import { GuildMember, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { hasPermission } from "knub/dist/helpers";
import { LogType } from "../../../data/LogType";
import { canActOn, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { errorMessage, resolveMember, resolveUser } from "../../../utils";
import { IgnoredEventType, ModActionsPluginType } from "../types";
import { formatReasonWithAttachments } from "./formatReasonWithAttachments";
import { ignoreEvent } from "./ignoreEvent";
import { isBanned } from "./isBanned";
import { kickMember } from "./kickMember";
import { readContactMethodsFromArgs } from "./readContactMethodsFromArgs";

export async function actualKickMemberCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  msg,
  args: {
    user: string;
    reason: string;
    mod: GuildMember;
    notify?: string;
    "notify-channel"?: TextChannel;
    clean?: boolean;
  },
) {
  const user = await resolveUser(pluginData.client, args.user);
  if (!user.id) {
    sendErrorMessage(pluginData, msg.channel, `User not found`);
    return;
  }

  const memberToKick = await resolveMember(pluginData.client, pluginData.guild, user.id);

  if (!memberToKick) {
    const banned = await isBanned(pluginData, user.id);
    if (banned) {
      sendErrorMessage(pluginData, msg.channel, `User is banned`);
    } else {
      sendErrorMessage(pluginData, msg.channel, `User not found on the server`);
    }

    return;
  }

  // Make sure we're allowed to kick this member
  if (!canActOn(pluginData, msg.member, memberToKick)) {
    sendErrorMessage(pluginData, msg.channel, "Cannot kick: insufficient permissions");
    return;
  }

  // The moderator who did the action is the message author or, if used, the specified -mod
  let mod = msg.member;
  if (args.mod) {
    if (!(await hasPermission(await pluginData.config.getForMessage(msg), "can_act_as_other"))) {
      sendErrorMessage(pluginData, msg.channel, "You don't have permission to use -mod");
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

  const reason = formatReasonWithAttachments(args.reason, msg.attachments);

  const kickResult = await kickMember(pluginData, memberToKick, reason, {
    contactMethods,
    caseArgs: {
      modId: mod.id,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
    },
  });

  if (args.clean) {
    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_BAN, memberToKick.id);
    ignoreEvent(pluginData, IgnoredEventType.Ban, memberToKick.id);

    try {
      await memberToKick.ban({ days: 1, reason: encodeURIComponent("kick -clean") });
    } catch {
      sendErrorMessage(pluginData, msg.channel, "Failed to ban the user to clean messages (-clean)");
    }

    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, memberToKick.id);
    ignoreEvent(pluginData, IgnoredEventType.Unban, memberToKick.id);

    try {
      await pluginData.guild.bans.remove(memberToKick.id, encodeURIComponent("kick -clean"));
    } catch {
      sendErrorMessage(pluginData, msg.channel, "Failed to unban the user after banning them (-clean)");
    }
  }

  if (kickResult.status === "failed") {
    msg.channel.send(errorMessage(`Failed to kick user`));
    return;
  }

  // Confirm the action to the moderator
  let response = `Kicked **${memberToKick.user.username}#${memberToKick.user.discriminator}** (Case #${kickResult.case.case_number})`;

  if (kickResult.notifyResult.text) response += ` (${kickResult.notifyResult.text})`;
  sendSuccessMessage(pluginData, msg.channel, response);
}
