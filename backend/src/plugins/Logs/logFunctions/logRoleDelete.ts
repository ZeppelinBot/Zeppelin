import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { Role } from "discord.js";
import { roleToTemplateSafeRole } from "../../../utils/templateSafeObjects";

interface LogRoleDeleteData {
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
