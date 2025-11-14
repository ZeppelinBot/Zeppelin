import { User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { UnknownUser } from "../../../utils.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberTimedUnbanData {
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
