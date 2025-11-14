import { GuildMember, PartialGuildMember } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberLeaveData {
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
