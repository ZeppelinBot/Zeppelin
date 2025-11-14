import { GuildMember } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberJoinWithPriorRecordsData {
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
