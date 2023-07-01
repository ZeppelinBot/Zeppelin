import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { UnknownUser } from "../../../utils";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMemberTimedUnbanData {
  mod: User | UnknownUser;
  userId: string;
  banTime: string;
  caseNumber: number;
  reason: string;
}

export function logMemberTimedUnban(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberTimedUnbanData) {
  return log(
    pluginData,
    LogType.MEMBER_TIMED_UNBAN,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      userId: data.userId,
      banTime: data.banTime,
      caseNumber: data.caseNumber,
      reason: data.reason,
    }),
    {
      userId: data.userId,
    },
  );
}
