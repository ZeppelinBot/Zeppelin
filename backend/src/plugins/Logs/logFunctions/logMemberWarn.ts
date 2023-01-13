import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember } from "discord.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";

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
