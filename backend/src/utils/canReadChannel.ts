import { Constants, GuildChannel, Member } from "eris";
import { memberHasChannelPermissions } from "./memberHasChannelPermissions";
import { readChannelPermissions } from "./readChannelPermissions";

export function canReadChannel(channel: GuildChannel, member: Member) {
  return memberHasChannelPermissions(member, channel, readChannelPermissions);
}
