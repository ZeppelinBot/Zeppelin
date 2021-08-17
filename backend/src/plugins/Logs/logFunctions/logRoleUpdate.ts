import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { Role } from "discord.js";
import { roleToTemplateSafeRole } from "../../../utils/templateSafeObjects";

interface LogRoleUpdateData {
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
