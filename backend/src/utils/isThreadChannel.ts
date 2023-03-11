import { AnyThreadChannel, Channel, ChannelType } from "discord.js";
import { ChannelTypeStrings } from "src/types";

export function isThreadChannel(channel: Channel): channel is AnyThreadChannel {
  return (
    channel.type === ChannelType.PublicThread ||
    channel.type === ChannelType.PrivateThread ||
    channel.type === ChannelType.AnnouncementThread
  );
}
