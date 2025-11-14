import { User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { UnknownUser } from "../../../utils.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberTimedMuteData {
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
