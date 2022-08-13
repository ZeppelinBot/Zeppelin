import { Channel, GuildChannel } from "discord.js";

export function isGuildChannel(channel: Channel): channel is GuildChannel {
  return channel.type.startsWith("GUILD_");
}
