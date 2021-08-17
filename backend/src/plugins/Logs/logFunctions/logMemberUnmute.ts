import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember, User } from "discord.js";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";

interface LogMemberUnmuteData {
  mod: GuildMember;
  user: User;
  caseNumber: number;
  reason: string;
}

export function logMemberUnmute(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberUnmuteData) {
  return log(
    pluginData,
    LogType.MEMBER_UNMUTE,
    createTypedTemplateSafeValueContainer({
      mod: memberToTemplateSafeMember(data.mod),
      user: userToTemplateSafeUser(data.user),
      caseNumber: data.caseNumber,
      reason: data.reason,
    }),
    {
      userId: data.user.id,
      bot: data.user.bot,
    },
  );
}
