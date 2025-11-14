import { User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogCaseUpdateData {
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
