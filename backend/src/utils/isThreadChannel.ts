import { AnyThreadChannel, Channel, ChannelType } from "discord.js";

export function isThreadChannel(channel: Channel): channel is AnyThreadChannel {
  return channel.isThread();
}
