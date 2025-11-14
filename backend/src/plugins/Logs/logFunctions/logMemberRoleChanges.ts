import { GuildMember, Role, User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { UnknownUser } from "../../../utils.js";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberRoleChangesData {
  mod: User | UnknownUser | null;
  member: GuildMember;
  addedRoles: Role[];
  removedRoles: Role[];
}

/**
 * @deprecated Use logMemberRoleAdd() and logMemberRoleRemove() instead
 */
export function logMemberRoleChanges(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberRoleChangesData) {
  return log(
    pluginData,
    LogType.MEMBER_ROLE_CHANGES,
    createTypedTemplateSafeValueContainer({
      mod: data.mod ? userToTemplateSafeUser(data.mod) : null,
      member: memberToTemplateSafeMember(data.member),
      addedRoles: data.addedRoles.map((r) => r.name).join(", "),
      removedRoles: data.removedRoles.map((r) => r.name).join(", "),
    }),
    {
      userId: data.member.id,
      bot: data.member.user.bot,
    },
  );
}
