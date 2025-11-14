import { GuildMember } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { Case } from "../../../data/entities/Case.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { caseToTemplateSafeCase, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogCaseDeleteData {
  mod: GuildMember;
  case: Case;
}

export function logCaseDelete(pluginData: GuildPluginData<LogsPluginType>, data: LogCaseDeleteData) {
  return log(
    pluginData,
    LogType.CASE_DELETE,
    createTypedTemplateSafeValueContainer({
      mod: memberToTemplateSafeMember(data.mod),
      case: caseToTemplateSafeCase(data.case),
    }),
    {},
  );
}
