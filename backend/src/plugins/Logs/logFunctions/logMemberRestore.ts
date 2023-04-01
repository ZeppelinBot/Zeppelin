import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
