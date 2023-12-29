import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
