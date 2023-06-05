import { Role } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { roleToTemplateSafeRole } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
