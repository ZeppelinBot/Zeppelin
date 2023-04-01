import { PermissionsBitField } from "discord.js";

/**
 * @param resolvedPermissions A Permission object from e.g. GuildChannel#permissionsOf() or Member#permission
 * @param requiredPermissions Bitmask of required permissions
 */
export function hasDiscordPermissions(
  resolvedPermissions: PermissionsBitField | Readonly<PermissionsBitField> | null,
  requiredPermissions: number | bigint,
) {
  if (resolvedPermissions == null) {
    return false;
  }

  if (resolvedPermissions.has(PermissionsBitField.Flags.Administrator)) {
    return true;
  }

  const nRequiredPermissions = BigInt(requiredPermissions);
  return Boolean((resolvedPermissions?.bitfield! & nRequiredPermissions) === nRequiredPermissions);
}
