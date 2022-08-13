import { Channel, DMChannel } from "discord.js";
import { ChannelTypeStrings } from "src/types";

export function isDmChannel(channel: Channel): channel is DMChannel {
  return channel.type === ChannelTypeStrings.DM || channel.type === ChannelTypeStrings.GROUP;
}
