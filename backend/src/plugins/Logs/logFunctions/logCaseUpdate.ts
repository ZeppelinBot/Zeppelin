import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
