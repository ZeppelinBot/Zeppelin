import { Constants, Permission } from "eris";

export function hasChannelPermissions(channelPermissions: Permission, permissions: number | number[]) {
  if (Boolean(channelPermissions.allow & Constants.Permissions.administrator)) {
    return true;
  }

  if (!Array.isArray(permissions)) {
    permissions = [permissions];
  }

  for (const permission of permissions) {
    if (!(channelPermissions.allow & permission)) return false;
  }

  return true;
}
