import { GuildMember, Message, TextChannel, User } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { MutesPlugin } from "../../../plugins/Mutes/MutesPlugin";
import { hasPermission, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { asSingleLine, UnknownUser } from "../../../utils";
import { ModActionsPluginType } from "../types";
import { formatReasonWithAttachments } from "./formatReasonWithAttachments";

export async function actualUnmuteCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  user: User | UnknownUser,
  msg: Message,
  args: { time?: number; reason?: string; mod?: GuildMember },
) {
  // The moderator who did the action is the message author or, if used, the specified -mod
  let mod = msg.author;
  let pp: User | null = null;

  if (args.mod) {
    if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg, channelId: msg.channel.id }))) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "You don't have permission to use -mod");
      return;
    }

    mod = args.mod.user;
    pp = msg.author;
  }

  const reason = args.reason ? formatReasonWithAttachments(args.reason, msg.attachments.array()) : undefined;

  const mutesPlugin = pluginData.getPlugin(MutesPlugin);
  const result = await mutesPlugin.unmuteUser(user.id, args.time, {
    modId: mod.id,
    ppId: pp ? pp.id : undefined,
    reason,
  });

  if (!result) {
    sendErrorMessage(pluginData, msg.channel as TextChannel, "User is not muted!");
    return;
  }

  // Confirm the action to the moderator
  if (args.time) {
    const timeUntilUnmute = args.time && humanizeDuration(args.time);
    sendSuccessMessage(
      pluginData,
      msg.channel as TextChannel,
      asSingleLine(`
        Unmuting **${user.username}#${user.discriminator}**
        in ${timeUntilUnmute} (Case #${result.case.case_number})
      `),
    );
  } else {
    sendSuccessMessage(
      pluginData,
      msg.channel as TextChannel,
      asSingleLine(`
        Unmuted **${user.username}#${user.discriminator}**
        (Case #${result.case.case_number})
      `),
    );
  }
}
