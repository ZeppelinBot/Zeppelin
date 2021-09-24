import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember, PartialGuildMember } from "discord.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";

interface LogMemberLeaveData {
  member: GuildMember | PartialGuildMember;
}

export function logMemberLeave(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberLeaveData) {
  return log(
    pluginData,
    LogType.MEMBER_LEAVE,
    createTypedTemplateSafeValueContainer({
      member: memberToTemplateSafeMember(data.member),
    }),
    {
      userId: data.member.id,
      bot: data.member.user?.bot ?? false,
    },
  );
}
