import { Permissions } from "discord.js";

const permissionNumberToName: Map<bigint, string> = new Map();
const ignoredPermissionConstants = ["all", "allGuild", "allText", "allVoice"];

for (const key in Permissions.FLAGS) {
  if (ignoredPermissionConstants.includes(key)) continue;
  permissionNumberToName.set(BigInt(Permissions.FLAGS[key]), key);
}

/**
 * @param permissions Bitmask of permissions to get the names for
 */
export function getPermissionNames(permissions: number | bigint): string[] {
  const permissionNames: string[] = [];
  for (const [permissionNumber, permissionName] of permissionNumberToName.entries()) {
    if (BigInt(permissions) & permissionNumber) {
      permissionNames.push(permissionName);
    }
  }
  return permissionNames;
}
