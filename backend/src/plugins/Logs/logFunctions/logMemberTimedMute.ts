import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { User } from "discord.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { UnknownUser } from "../../../utils";

interface LogMemberTimedMuteData {
  mod: User | UnknownUser;
  user: User | UnknownUser;
  time: string;
  caseNumber: number;
  reason: string;
}

export function logMemberTimedMute(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberTimedMuteData) {
  return log(
    pluginData,
    LogType.MEMBER_TIMED_MUTE,
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
