import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember, Role, User } from "discord.js";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";

interface LogMemberRoleAddData {
  mod: User | null;
  member: GuildMember;
  roles: Role[];
}

export function logMemberRoleAdd(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberRoleAddData) {
  return log(
    pluginData,
    LogType.MEMBER_ROLE_ADD,
    createTypedTemplateSafeValueContainer({
      mod: data.mod ? userToTemplateSafeUser(data.mod) : null,
      member: memberToTemplateSafeMember(data.member),
      roles: data.roles.map((r) => r.name).join(", "),
    }),
    {
      userId: data.member.id,
      roles: Array.from(data.member.roles.cache.keys()),
      bot: data.member.user.bot,
    },
  );
}
