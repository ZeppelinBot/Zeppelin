import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMemberWarnData {
  mod: GuildMember;
  member: GuildMember;
  caseNumber: number;
  reason: string;
}

export function logMemberWarn(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberWarnData) {
  return log(
    pluginData,
    LogType.MEMBER_WARN,
    createTypedTemplateSafeValueContainer({
      mod: memberToTemplateSafeMember(data.mod),
      member: memberToTemplateSafeMember(data.member),
      caseNumber: data.caseNumber,
      reason: data.reason,
    }),
    {
      userId: data.member.id,
      roles: Array.from(data.member.roles.cache.keys()),
      bot: data.member.user.bot,
    },
  );
}
