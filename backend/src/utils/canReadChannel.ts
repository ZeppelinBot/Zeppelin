import { Constants, GuildChannel, Member } from "eris";
import { readChannelPermissions } from "./readChannelPermissions";
import { getMissingChannelPermissions } from "./getMissingChannelPermissions";

export function canReadChannel(channel: GuildChannel, member: Member) {
  // Not missing permissions required to read the channel = can read channel
  return !getMissingChannelPermissions(member, channel, readChannelPermissions);
}
