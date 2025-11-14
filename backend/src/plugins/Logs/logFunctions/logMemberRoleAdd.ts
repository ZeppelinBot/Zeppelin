import { GuildMember, Role, User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { UnknownRole } from "../../../utils.js";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberRoleAddData {
  mod: User | null;
  member: GuildMember;
  roles: Array<Role | UnknownRole>;
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
