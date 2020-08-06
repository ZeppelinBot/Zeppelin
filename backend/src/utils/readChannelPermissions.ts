import { Constants } from "eris";

/**
 * Bitmask of permissions required to read messages in a channel
 */
export const readChannelPermissions = Constants.Permissions.readMessages | Constants.Permissions.readMessageHistory;

/**
 * Bitmask of permissions required to read messages in a channel (bigint)
 */
export const nReadChannelPermissions = BigInt(readChannelPermissions);
