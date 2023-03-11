import { Channel, GuildBasedChannel, GuildChannel } from "discord.js";

export function isGuildChannel(channel: Channel): channel is GuildBasedChannel {
  return channel.type.toString().startsWith("GUILD_");
}
