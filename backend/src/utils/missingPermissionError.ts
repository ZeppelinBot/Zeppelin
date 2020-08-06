import { getPermissionNames } from "./getPermissionNames";

export function missingPermissionError(missingPermissions: number | bigint): string {
  const permissionNames = getPermissionNames(missingPermissions);
  return `Missing permissions: **${permissionNames.join("**, **")}**`;
}
