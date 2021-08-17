import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember } from "discord.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";

interface LogMemberMuteRejoinData {
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
