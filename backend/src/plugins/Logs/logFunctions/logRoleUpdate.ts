import { Role } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { roleToTemplateSafeRole } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogRoleUpdateData {
  oldRole: Role;
  newRole: Role;
  differenceString: string;
}

export function logRoleUpdate(pluginData: GuildPluginData<LogsPluginType>, data: LogRoleUpdateData) {
  return log(
    pluginData,
    LogType.ROLE_UPDATE,
    createTypedTemplateSafeValueContainer({
      oldRole: roleToTemplateSafeRole(data.oldRole),
      newRole: roleToTemplateSafeRole(data.newRole),
      differenceString: data.differenceString,
    }),
    {},
  );
}
