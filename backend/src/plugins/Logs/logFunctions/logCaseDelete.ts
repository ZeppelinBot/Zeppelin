import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { Case } from "../../../data/entities/Case";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { caseToTemplateSafeCase, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogCaseDeleteData {
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
