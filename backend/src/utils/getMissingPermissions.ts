import { Constants, Permission } from "eris";

/**
 * @param resolvedPermissions A Permission object from e.g. GuildChannel#permissionsOf() or Member#permission
 * @param requiredPermissions Bitmask of required permissions
 * @return Bitmask of missing permissions
 */
export function getMissingPermissions(resolvedPermissions: Permission, requiredPermissions: number | bigint): bigint {
  const allowedPermissions = BigInt(resolvedPermissions.allow);
  const nRequiredPermissions = BigInt(requiredPermissions);

  if (Boolean(allowedPermissions & BigInt(Constants.Permissions.administrator))) {
    return BigInt(0);
  }

  return nRequiredPermissions & ~allowedPermissions;
}
