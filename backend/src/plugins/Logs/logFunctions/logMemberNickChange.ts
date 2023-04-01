import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMemberNickChangeData {
  member: GuildMember;
  oldNick: string;
  newNick: string;
}

export function logMemberNickChange(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberNickChangeData) {
  return log(
    pluginData,
    LogType.MEMBER_NICK_CHANGE,
    createTypedTemplateSafeValueContainer({
      member: memberToTemplateSafeMember(data.member),
      oldNick: data.oldNick,
      newNick: data.newNick,
    }),
    {
      userId: data.member.id,
      roles: Array.from(data.member.roles.cache.keys()),
      bot: data.member.user.bot,
    },
  );
}
