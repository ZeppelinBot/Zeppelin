import { Constants, GuildChannel, Member, Permission } from "eris";
import { PluginData } from "knub";
import { hasDiscordPermissions } from "./hasDiscordPermissions";

/**
 * @param requiredPermissions Bitmask of required permissions
 */
export function memberHasChannelPermissions(
  member: Member,
  channel: GuildChannel,
  requiredPermissions: number | bigint,
) {
  const memberChannelPermissions = channel.permissionsOf(member.id);
  return hasDiscordPermissions(memberChannelPermissions, requiredPermissions);
}
