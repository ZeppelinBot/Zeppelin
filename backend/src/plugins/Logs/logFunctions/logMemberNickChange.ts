import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember } from "discord.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";

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
