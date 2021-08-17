import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { User } from "discord.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";

interface LogCaseUpdateData {
  mod: User;
  caseNumber: number;
  caseType: string;
  note: string;
}

export function logCaseUpdate(pluginData: GuildPluginData<LogsPluginType>, data: LogCaseUpdateData) {
  return log(
    pluginData,
    LogType.CASE_UPDATE,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      caseNumber: data.caseNumber,
      caseType: data.caseType,
      note: data.note,
    }),
    {},
  );
}
