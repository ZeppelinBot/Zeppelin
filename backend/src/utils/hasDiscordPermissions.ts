import { Permissions, PermissionString } from "discord.js";

/**
 * @param resolvedPermissions A Permission object from e.g. GuildChannel#permissionsOf() or Member#permission
 * @param requiredPermissions Bitmask of required permissions
 */
export function hasDiscordPermissions(
  resolvedPermissions: Permissions | Readonly<Permissions> | null,
  requiredPermissions: number | bigint,
) {
  if (resolvedPermissions == null) {
    return false;
  }

  if (resolvedPermissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
    return true;
  }

  const nRequiredPermissions = BigInt(requiredPermissions);
  return Boolean((resolvedPermissions?.bitfield! & nRequiredPermissions) === nRequiredPermissions);
}
