import { GuildMember } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberNickChangeData {
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
