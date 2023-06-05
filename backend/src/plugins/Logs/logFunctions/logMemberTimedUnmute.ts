import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { UnknownUser } from "../../../utils";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMemberTimedUnmuteData {
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
