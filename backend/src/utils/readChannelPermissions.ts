import { Permissions } from "discord.js";

/**
 * Bitmask of permissions required to read messages in a channel
 */
export const readChannelPermissions = Permissions.FLAGS.VIEW_CHANNEL | Permissions.FLAGS.READ_MESSAGE_HISTORY;

/**
 * Bitmask of permissions required to read messages in a channel (bigint)
 */
export const nReadChannelPermissions = BigInt(readChannelPermissions);
