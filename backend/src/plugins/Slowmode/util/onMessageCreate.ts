import { SavedMessage } from "../../../data/entities/SavedMessage";
import { TextChannel } from "eris";
import { GuildPluginData } from "knub";
import { SlowmodePluginType } from "../types";
import { resolveMember } from "../../../utils";
import { applyBotSlowmodeToUserId } from "./applyBotSlowmodeToUserId";
import { hasPermission } from "../../../pluginUtils";
import { getMissingChannelPermissions } from "../../../utils/getMissingChannelPermissions";
import { BOT_SLOWMODE_PERMISSIONS } from "../requiredPermissions";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { LogType } from "../../../data/LogType";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { messageLock } from "../../../utils/lockNameHelpers";

export async function onMessageCreate(pluginData: GuildPluginData<SlowmodePluginType>, msg: SavedMessage) {
  if (msg.is_bot) return;

  const channel = pluginData.guild.channels.get(msg.channel_id) as TextChannel;
  if (!channel) return;

  // Don't apply slowmode if the lock was interrupted earlier (e.g. the message was caught by word filters)
  const thisMsgLock = await pluginData.locks.acquire(messageLock(msg));
  if (thisMsgLock.interrupted) return;

  // Check if this channel even *has* a bot-maintained slowmode
  const channelSlowmode = await pluginData.state.slowmodes.getChannelSlowmode(channel.id);
  if (!channelSlowmode) return thisMsgLock.unlock();

  // Make sure this user is affected by the slowmode
  const member = await resolveMember(pluginData.client, pluginData.guild, msg.user_id);
  const isAffected = hasPermission(pluginData, "is_affected", { channelId: channel.id, userId: msg.user_id, member });
  if (!isAffected) return thisMsgLock.unlock();

  // Make sure we have the appropriate permissions to manage this slowmode
  const me = pluginData.guild.members.get(pluginData.client.user.id)!;
  const missingPermissions = getMissingChannelPermissions(me, channel, BOT_SLOWMODE_PERMISSIONS);
  if (missingPermissions) {
    const logs = pluginData.getPlugin(LogsPlugin);
    logs.log(LogType.BOT_ALERT, {
      body: `Unable to manage bot slowmode in <#${channel.id}>. ${missingPermissionError(missingPermissions)}`,
    });
    return;
  }

  // Delete any extra messages sent after a slowmode was already applied
  const userHasSlowmode = await pluginData.state.slowmodes.userHasSlowmode(channel.id, msg.user_id);
  if (userHasSlowmode) {
    const message = await channel.getMessage(msg.id);
    if (message) {
      message.delete();
      return thisMsgLock.interrupt();
    }

    return thisMsgLock.unlock();
  }

  await applyBotSlowmodeToUserId(pluginData, channel, msg.user_id);
  thisMsgLock.unlock();
}
