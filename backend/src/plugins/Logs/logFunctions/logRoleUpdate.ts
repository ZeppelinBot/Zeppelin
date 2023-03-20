import { Role } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { roleToTemplateSafeRole } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
