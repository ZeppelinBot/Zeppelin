import { GuildMember, GuildTextBasedChannel } from "discord.js";
import { getMissingChannelPermissions } from "./getMissingChannelPermissions";
import { readChannelPermissions } from "./readChannelPermissions";

export function canReadChannel(channel: GuildTextBasedChannel, member: GuildMember) {
  // Not missing permissions required to read the channel = can read channel
  return !getMissingChannelPermissions(member, channel, readChannelPermissions);
}
