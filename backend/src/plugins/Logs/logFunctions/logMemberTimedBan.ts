import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { User } from "discord.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { UnknownUser } from "../../../utils";

interface LogMemberTimedBanData {
  mod: User | UnknownUser;
  user: User | UnknownUser;
  banTime: string;
  caseNumber: number;
  reason: string;
}

export function logMemberTimedBan(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberTimedBanData) {
  return log(
    pluginData,
    LogType.MEMBER_TIMED_BAN,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      user: userToTemplateSafeUser(data.user),
      banTime: data.banTime,
      caseNumber: data.caseNumber,
      reason: data.reason,
    }),
    {
      userId: data.user.id,
      bot: data.user instanceof User ? data.user.bot : false,
    },
  );
}
