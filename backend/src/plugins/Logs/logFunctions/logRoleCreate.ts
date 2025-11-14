import { Role } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { roleToTemplateSafeRole } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogRoleCreateData {
  role: Role;
}

export function logRoleCreate(pluginData: GuildPluginData<LogsPluginType>, data: LogRoleCreateData) {
  return log(
    pluginData,
    LogType.ROLE_CREATE,
    createTypedTemplateSafeValueContainer({
      role: roleToTemplateSafeRole(data.role),
    }),
    {},
  );
}
