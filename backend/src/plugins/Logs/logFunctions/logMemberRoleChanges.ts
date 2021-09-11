import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember, Role, User } from "discord.js";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { UnknownUser } from "../../../utils";

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
