import { GuildMember, Role, User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMemberRoleRemoveData {
  mod: User | null;
  member: GuildMember;
  roles: Role[];
}

export function logMemberRoleRemove(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberRoleRemoveData) {
  return log(
    pluginData,
    LogType.MEMBER_ROLE_REMOVE,
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
