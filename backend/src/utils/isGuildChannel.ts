import type { Channel, GuildBasedChannel } from "discord.js";

export function isGuildChannel(channel: Channel): channel is GuildBasedChannel {
  return "guild" in channel && channel.guild !== null;
}
