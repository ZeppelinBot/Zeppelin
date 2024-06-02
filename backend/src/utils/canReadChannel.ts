import { GuildMember, GuildTextBasedChannel } from "discord.js";
import { getMissingChannelPermissions } from "./getMissingChannelPermissions.js";
import { readChannelPermissions } from "./readChannelPermissions.js";

export function canReadChannel(channel: GuildTextBasedChannel, member: GuildMember) {
  // Not missing permissions required to read the channel = can read channel
  return !getMissingChannelPermissions(member, channel, readChannelPermissions);
}
