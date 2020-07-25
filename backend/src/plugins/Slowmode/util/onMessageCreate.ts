import { SavedMessage } from "src/data/entities/SavedMessage";
import { GuildChannel, TextChannel } from "eris";
import { PluginData } from "knub";
import { SlowmodePluginType } from "../types";
import { resolveMember } from "src/utils";
import { applyBotSlowmodeToUserId } from "./applyBotSlowmodeToUserId";
import { hasPermission } from "src/pluginUtils";

export async function onMessageCreate(pluginData: PluginData<SlowmodePluginType>, msg: SavedMessage) {
  if (msg.is_bot) return;

  const channel = pluginData.guild.channels.get(msg.channel_id) as GuildChannel & TextChannel;
  if (!channel) return;

  // Don't apply slowmode if the lock was interrupted earlier (e.g. the message was caught by word filters)
  const thisMsgLock = await pluginData.locks.acquire(`message-${msg.id}`);
  if (thisMsgLock.interrupted) return;

  // Check if this channel even *has* a bot-maintained slowmode
  const channelSlowmode = await pluginData.state.slowmodes.getChannelSlowmode(channel.id);
  if (!channelSlowmode) return thisMsgLock.unlock();

  // Make sure this user is affected by the slowmode
  const member = await resolveMember(pluginData.client, pluginData.guild, msg.user_id);
  const isAffected = hasPermission(pluginData, "is_affected", { channelId: channel.id, userId: msg.user_id, member });
  if (!isAffected) return thisMsgLock.unlock();

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
