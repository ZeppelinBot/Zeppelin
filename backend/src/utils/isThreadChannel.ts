import { Channel, ThreadChannel } from "discord.js";
import { ChannelTypeStrings } from "src/types";

export function isThreadChannel(channel: Channel): channel is ThreadChannel {
  return (
    channel.type === ChannelTypeStrings.NEWS_THREAD ||
    channel.type === ChannelTypeStrings.PUBLIC_THREAD ||
    channel.type === ChannelTypeStrings.PRIVATE_THREAD
  );
}
