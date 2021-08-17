import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember } from "discord.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";

interface LogMemberRestoreData {
  member: GuildMember;
  restoredData: string;
}

export function logMemberRestore(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberRestoreData) {
  return log(
    pluginData,
    LogType.MEMBER_RESTORE,
    createTypedTemplateSafeValueContainer({
      member: memberToTemplateSafeMember(data.member),
      restoredData: data.restoredData,
    }),
    {
      userId: data.member.id,
      roles: Array.from(data.member.roles.cache.keys()),
      bot: data.member.user.bot,
    },
  );
}
