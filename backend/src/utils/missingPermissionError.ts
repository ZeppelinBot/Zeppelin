import { getPermissionNames } from "./getPermissionNames.js";

export function missingPermissionError(missingPermissions: number | bigint): string {
  const permissionNames = getPermissionNames(missingPermissions);
  return `Missing permissions: **${permissionNames.join("**, **")}**`;
}
