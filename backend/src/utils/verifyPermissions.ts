import { Constants, Permission } from "eris";
import { PluginData } from "knub";
import { hasDiscordPermissions } from "./hasDiscordPermissions";
import { LogsPlugin } from "../plugins/Logs/LogsPlugin";
import { LogType } from "../data/LogType";

const defaultErrorText = `Missing permissions.`;

const camelCaseToTitleCase = str =>
  str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(" ");

const permissionNumberToName: Map<bigint, string> = new Map();
for (const key in Constants.Permissions) {
  permissionNumberToName.set(BigInt(Constants.Permissions[key]), camelCaseToTitleCase(key));
}

/**
 *
 * @param resolvedPermissions A Permission object from e.g. GuildChannel#permissionsOf() or Member#permission
 * @param requiredPermissions Bitmask of required permissions
 * @param errorText Custom error text
 */
export function verifyPermissions(
  pluginData: PluginData<any>,
  resolvedPermissions: Permission,
  requiredPermissions: number | bigint,
  errorText?: string,
) {
  const nRequiredPermissions = BigInt(requiredPermissions);

  if (!hasDiscordPermissions(resolvedPermissions, nRequiredPermissions)) {
    const requiredPermissionNames = [];
    for (const [permissionNumber, permissionName] of permissionNumberToName.entries()) {
      if (nRequiredPermissions & permissionNumber) {
        requiredPermissionNames.push(permissionName);
      }
    }

    const logs = pluginData.getPlugin(LogsPlugin);
    logs.log(LogType.BOT_ALERT, {
      body: `${errorText ||
        defaultErrorText} Please ensure I have the following permissions: **${requiredPermissionNames.join(
        "**, **",
      )}**`.trim(),
    });
    return false;
  }

  return true;
}
