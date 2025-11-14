import { Role } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { roleToTemplateSafeRole } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogRoleDeleteData {
  role: Role;
}

export function logRoleDelete(pluginData: GuildPluginData<LogsPluginType>, data: LogRoleDeleteData) {
  return log(
    pluginData,
    LogType.ROLE_DELETE,
    createTypedTemplateSafeValueContainer({
      role: roleToTemplateSafeRole(data.role),
    }),
    {},
  );
}
