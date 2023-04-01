import { GuildMember, Role, User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { UnknownUser } from "../../../utils";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMemberRoleChangesData {
  mod: User | UnknownUser | null;
  member: GuildMember;
  addedRoles: Role[];
  removedRoles: Role[];
}

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
