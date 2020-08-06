import { Constants, GuildChannel, Member, Permission } from "eris";
import { PluginData } from "knub";
import { hasChannelPermissions } from "./hasChannelPermissions";

export function memberHasChannelPermissions(member: Member, channel: GuildChannel, permissions: number | number[]) {
  const memberChannelPermissions = channel.permissionsOf(member.id);
  return hasChannelPermissions(memberChannelPermissions, permissions);
}
