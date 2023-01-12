import { GuildPluginData } from "knub";
import { GuildMember, User } from "discord.js";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { UnknownUser } from "../../../utils";

interface LogMemberWarnData {
  mod: GuildMember;
  member?: GuildMember | null;
  user?: User | UnknownUser | null;
  caseNumber: number;
  reason: string;
}

export function logMemberWarn(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberWarnData) {
  return log(
    pluginData,
    LogType.MEMBER_WARN,
    createTypedTemplateSafeValueContainer({
      mod: memberToTemplateSafeMember(data.mod),
      member: memberToTemplateSafeMember(data.member, data.user),
      caseNumber: data.caseNumber,
      reason: data.reason,
    }),
    {
      userId: data.member?.id ?? data.user?.id,
      roles: data.member ? Array.from(data.member.roles.cache.keys()) : [],
      bot: data.member?.user.bot ?? (data.user as User)?.bot,
    },
  );
}
