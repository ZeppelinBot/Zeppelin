import type { Channel, DMChannel } from "discord.js";

export function isDmChannel(channel: Channel): channel is DMChannel {
  return channel.isDMBased();
}
