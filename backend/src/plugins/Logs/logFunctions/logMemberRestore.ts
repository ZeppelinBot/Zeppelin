import { GuildMember } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberRestoreData {
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
