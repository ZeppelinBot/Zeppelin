import { User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { UnknownUser } from "../../../utils.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberTimedUnmuteData {
  mod: User;
  user: User | UnknownUser;
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
    {
      userId: data.user.id,
      bot: data.user instanceof User ? data.user.bot : false,
    },
  );
}
