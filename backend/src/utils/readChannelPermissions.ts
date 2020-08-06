import { Constants } from "eris";

/**
 * Bitmask of permissions required to read messages in a channel
 */
export const readChannelPermissions =
  BigInt(Constants.Permissions.readMessages) | BigInt(Constants.Permissions.readMessageHistory);
