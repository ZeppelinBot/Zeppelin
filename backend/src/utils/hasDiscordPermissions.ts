import { Permissions } from "discord.js";

/**
 * @param resolvedPermissions A Permission object from e.g. GuildChannel#permissionsOf() or Member#permission
 * @param requiredPermissions Bitmask of required permissions
 */
export function hasDiscordPermissions(
  resolvedPermissions: Permissions | Readonly<Permissions> | null,
  requiredPermissions: number | bigint,
) {
  const allowedPermissions = BigInt(resolvedPermissions);
  const nRequiredPermissions = BigInt(requiredPermissions);

  if (Boolean(allowedPermissions & BigInt(Permissions.FLAGS.ADMINISTRATOR))) {
    return true;
  }

  return Boolean((allowedPermissions & nRequiredPermissions) === nRequiredPermissions);
}
