import { GuildChannel, GuildMember } from "discord.js";
import { getMissingPermissions } from "./getMissingPermissions";

/**
 * @param requiredPermissions Bitmask of required permissions
 * @return Bitmask of missing permissions
 */
export function getMissingChannelPermissions(
  member: GuildMember,
  channel: GuildChannel,
  requiredPermissions: number | bigint,
): bigint {
  const memberChannelPermissions = channel.permissionsFor(member.id);
  if (!memberChannelPermissions) return BigInt(requiredPermissions);
  return getMissingPermissions(memberChannelPermissions, requiredPermissions);
}
