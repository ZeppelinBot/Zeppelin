import { Permissions } from "discord.js";

/**
 * @param resolvedPermissions A Permission object from e.g. GuildChannel#permissionsFor() or Member#permission
 * @param requiredPermissions Bitmask of required permissions
 * @return Bitmask of missing permissions
 */
export function getMissingPermissions(
  resolvedPermissions: Permissions | Readonly<Permissions>,
  requiredPermissions: number | bigint,
): bigint {
  const allowedPermissions = BigInt(resolvedPermissions);
  const nRequiredPermissions = BigInt(requiredPermissions);

  if (Boolean(allowedPermissions & BigInt(Permissions.FLAGS.ADMINISTRATOR))) {
    return BigInt(0);
  }

  return nRequiredPermissions & ~allowedPermissions;
}
