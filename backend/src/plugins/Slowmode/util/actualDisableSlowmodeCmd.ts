import { Message, TextChannel } from "discord.js";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { noop } from "../../../utils";
import { getMissingChannelPermissions } from "../../../utils/getMissingChannelPermissions";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { BOT_SLOWMODE_DISABLE_PERMISSIONS } from "../requiredPermissions";
import { disableBotSlowmodeForChannel } from "./disableBotSlowmodeForChannel";

export async function actualDisableSlowmodeCmd(msg: Message, args, pluginData) {
  const botSlowmode = await pluginData.state.slowmodes.getChannelSlowmode(args.channel.id);
  const hasNativeSlowmode = args.channel.rateLimitPerUser;

  if (!botSlowmode && hasNativeSlowmode === 0) {
    sendErrorMessage(pluginData, msg.channel as TextChannel, "Channel is not on slowmode!");
    return;
  }

  const me = pluginData.guild.members.cache.get(pluginData.client.user!.id);
  const missingPermissions = getMissingChannelPermissions(me, args.channel, BOT_SLOWMODE_DISABLE_PERMISSIONS);
  if (missingPermissions) {
    sendErrorMessage(
      pluginData,
      msg.channel as TextChannel,
      `Unable to disable slowmode. ${missingPermissionError(missingPermissions)}`,
    );
    return;
  }

  const initMsg = await msg.channel.send("Disabling slowmode...");

  // Disable bot-maintained slowmode
  let failedUsers: string[] = [];
  if (botSlowmode) {
    const result = await disableBotSlowmodeForChannel(pluginData, args.channel);
    failedUsers = result.failedUsers;
  }

  // Disable native slowmode
  if (hasNativeSlowmode) {
    await args.channel.edit({ rateLimitPerUser: 0 });
  }

  if (failedUsers.length) {
    sendSuccessMessage(
      pluginData,
      msg.channel as TextChannel,
      `Slowmode disabled! Failed to clear slowmode from the following users:\n\n<@!${failedUsers.join(">\n<@!")}>`,
    );
  } else {
    sendSuccessMessage(pluginData, msg.channel as TextChannel, "Slowmode disabled!");
    initMsg.delete().catch(noop);
  }
}
