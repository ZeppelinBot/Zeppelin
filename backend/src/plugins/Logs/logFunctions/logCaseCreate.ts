import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogCaseCreateData {
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
