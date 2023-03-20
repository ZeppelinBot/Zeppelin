import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { UnknownUser } from "../../../utils";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
