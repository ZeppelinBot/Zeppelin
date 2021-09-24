import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember } from "discord.js";
import { caseToTemplateSafeCase, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { Case } from "../../../data/entities/Case";

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
