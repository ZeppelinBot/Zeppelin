import { Constants, Permission } from "eris";

/**
 * @param resolvedPermissions A Permission object from e.g. GuildChannel#permissionsOf() or Member#permission
 * @param requiredPermissions Bitmask of required permissions
 */
export function hasDiscordPermissions(resolvedPermissions: Permission, requiredPermissions: number | bigint) {
  const allowedPermissions = BigInt(resolvedPermissions.allow);
  const nRequiredPermissions = BigInt(requiredPermissions);

  if (Boolean(allowedPermissions & BigInt(Constants.Permissions.administrator))) {
    return true;
  }

  return Boolean((allowedPermissions & nRequiredPermissions) === nRequiredPermissions);
}
