import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { User } from "discord.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";

interface LogMemberTimedUnmuteData {
  mod: User;
  user: User;
  time: string;
  caseNumber: number;
  reason: string;
}

export function logMemberTimedUnmute(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberTimedUnmuteData) {
  return log(
    pluginData,
    LogType.MEMBER_TIMED_UNMUTE,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      user: userToTemplateSafeUser(data.user),
      time: data.time,
      caseNumber: data.caseNumber,
      reason: data.reason,
    }),
    {},
  );
}
