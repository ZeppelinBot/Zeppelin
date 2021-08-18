import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember, User } from "discord.js";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { UnknownUser } from "../../../utils";

interface LogMemberUnmuteData {
  mod: User;
  user: User | UnknownUser;
  caseNumber: number;
  reason: string;
}

export function logMemberUnmute(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberUnmuteData) {
  return log(
    pluginData,
    LogType.MEMBER_UNMUTE,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      user: userToTemplateSafeUser(data.user),
      caseNumber: data.caseNumber,
      reason: data.reason,
    }),
    {
      userId: data.user.id,
      bot: data.user instanceof User ? data.user.bot : false,
    },
  );
}
