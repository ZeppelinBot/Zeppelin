import { PermissionsBitField } from "discord.js";

/**
 * Bitmask of permissions required to read messages in a channel
 */
export const readChannelPermissions =
  PermissionsBitField.Flags.ViewChannel | PermissionsBitField.Flags.ReadMessageHistory;

/**
 * Bitmask of permissions required to read messages in a channel (bigint)
 */
export const nReadChannelPermissions = BigInt(readChannelPermissions);
