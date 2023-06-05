import { Role } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { roleToTemplateSafeRole } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
