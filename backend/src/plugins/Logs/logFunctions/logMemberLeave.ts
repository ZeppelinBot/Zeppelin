import { GuildMember, PartialGuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
