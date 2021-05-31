import { Permissions } from "discord.js";

const camelCaseToTitleCase = str =>
  str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(" ");

const permissionNumberToName: Map<bigint, string> = new Map();
const ignoredPermissionConstants = ["all", "allGuild", "allText", "allVoice"];

for (const key in Permissions.FLAGS) {
  if (ignoredPermissionConstants.includes(key)) continue;
  permissionNumberToName.set(BigInt(Permissions.FLAGS[key]), camelCaseToTitleCase(key));
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
