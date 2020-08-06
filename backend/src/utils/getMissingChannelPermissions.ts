import { Constants, GuildChannel, Member, Permission } from "eris";
import { getMissingPermissions } from "./getMissingPermissions";

/**
 * @param requiredPermissions Bitmask of required permissions
 * @return Bitmask of missing permissions
 */
export function getMissingChannelPermissions(
  member: Member,
  channel: GuildChannel,
  requiredPermissions: number | bigint,
): bigint {
  const memberChannelPermissions = channel.permissionsOf(member.id);
  return getMissingPermissions(memberChannelPermissions, requiredPermissions);
}
