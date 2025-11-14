import { GuildMember } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberMuteRejoinData {
  member: GuildMember;
}

export function logMemberMuteRejoin(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberMuteRejoinData) {
  return log(
    pluginData,
    LogType.MEMBER_MUTE_REJOIN,
    createTypedTemplateSafeValueContainer({
      member: memberToTemplateSafeMember(data.member),
    }),
    {
      userId: data.member.id,
      bot: data.member.user.bot,
    },
  );
}
