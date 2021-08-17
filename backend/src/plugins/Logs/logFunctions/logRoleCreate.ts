import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { Role } from "discord.js";
import { roleToTemplateSafeRole } from "../../../utils/templateSafeObjects";

interface LogRoleCreateData {
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
