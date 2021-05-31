import { readChannelPermissions } from "./readChannelPermissions";
import { getMissingChannelPermissions } from "./getMissingChannelPermissions";
import { GuildChannel, GuildMember } from "discord.js";

export function canReadChannel(channel: GuildChannel, member: GuildMember) {
  // Not missing permissions required to read the channel = can read channel
  return !getMissingChannelPermissions(member, channel, readChannelPermissions);
}
