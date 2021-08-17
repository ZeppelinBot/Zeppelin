import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember } from "discord.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";

interface LogMemberJoinWithPriorRecordsData {
  member: GuildMember;
  recentCaseSummary: string;
}

export function logMemberJoinWithPriorRecords(
  pluginData: GuildPluginData<LogsPluginType>,
  data: LogMemberJoinWithPriorRecordsData,
) {
  return log(
    pluginData,
    LogType.MEMBER_JOIN_WITH_PRIOR_RECORDS,
    createTypedTemplateSafeValueContainer({
      member: memberToTemplateSafeMember(data.member),
      recentCaseSummary: data.recentCaseSummary,
    }),
    {
      userId: data.member.id,
      bot: data.member.user.bot,
    },
  );
}
