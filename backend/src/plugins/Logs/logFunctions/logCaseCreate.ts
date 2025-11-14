import { User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogCaseCreateData {
  mod: User;
  userId: string;
  caseNum: number;
  caseType: string;
  reason: string;
}

export function logCaseCreate(pluginData: GuildPluginData<LogsPluginType>, data: LogCaseCreateData) {
  return log(
    pluginData,
    LogType.CASE_CREATE,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      userId: data.userId,
      caseNum: data.caseNum,
      caseType: data.caseType,
      reason: data.reason,
    }),
    {
      userId: data.userId,
    },
  );
}
