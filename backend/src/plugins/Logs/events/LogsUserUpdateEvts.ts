import { GuildAuditLogs } from "discord.js";
import diff from "lodash.difference";
import isEqual from "lodash.isequal";
import { memberToConfigAccessibleMember, userToConfigAccessibleUser } from "src/utils/configAccessibleObjects";
import { LogType } from "../../../data/LogType";
import { safeFindRelevantAuditLogEntry } from "../../../utils/safeFindRelevantAuditLogEntry";
import { logsEvt } from "../types";

export const LogsGuildMemberUpdateEvt = logsEvt({
  event: "guildMemberUpdate",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const oldMember = meta.args.oldMember;
    const member = meta.args.newMember;

    if (!oldMember) return;

    const logMember = memberToConfigAccessibleMember(member);

    if (member.nickname !== oldMember.nickname) {
      pluginData.state.guildLogs.log(LogType.MEMBER_NICK_CHANGE, {
        member: logMember,
        oldNick: oldMember.nickname != null ? oldMember.nickname : "<none>",
        newNick: member.nickname != null ? member.nickname : "<none>",
      });
    }

    if (!isEqual(oldMember.roles, member.roles)) {
      const addedRoles = diff(member.roles, oldMember.roles);
      const removedRoles = diff(oldMember.roles, member.roles);
      let skip = false;

      if (
        addedRoles.length &&
        removedRoles.length &&
        pluginData.state.guildLogs.isLogIgnored(LogType.MEMBER_ROLE_CHANGES, member.id)
      ) {
        skip = true;
      } else if (addedRoles.length && pluginData.state.guildLogs.isLogIgnored(LogType.MEMBER_ROLE_ADD, member.id)) {
        skip = true;
      } else if (
        removedRoles.length &&
        pluginData.state.guildLogs.isLogIgnored(LogType.MEMBER_ROLE_REMOVE, member.id)
      ) {
        skip = true;
      }

      if (!skip) {
        const relevantAuditLogEntry = await safeFindRelevantAuditLogEntry(
          pluginData,
          GuildAuditLogs.Actions.MEMBER_ROLE_UPDATE as number,
          member.id,
        );
        const mod = relevantAuditLogEntry ? relevantAuditLogEntry.executor : null;

        if (addedRoles.length && removedRoles.length) {
          // Roles added *and* removed
          pluginData.state.guildLogs.log(
            LogType.MEMBER_ROLE_CHANGES,
            {
              member: logMember,
              addedRoles: addedRoles
                .map(roleId => pluginData.guild.roles.cache.get(roleId) || { id: roleId, name: `Unknown (${roleId})` })
                .map(r => r.name)
                .join(", "),
              removedRoles: removedRoles
                .map(roleId => pluginData.guild.roles.cache.get(roleId) || { id: roleId, name: `Unknown (${roleId})` })
                .map(r => r.name)
                .join(", "),
              mod: mod ? userToConfigAccessibleUser(mod) : {},
            },
            member.id,
          );
        } else if (addedRoles.length) {
          // Roles added
          pluginData.state.guildLogs.log(
            LogType.MEMBER_ROLE_ADD,
            {
              member: logMember,
              roles: addedRoles
                .map(roleId => pluginData.guild.roles.cache.get(roleId) || { id: roleId, name: `Unknown (${roleId})` })
                .map(r => r.name)
                .join(", "),
              mod: mod ? userToConfigAccessibleUser(mod) : {},
            },
            member.id,
          );
        } else if (removedRoles.length && !addedRoles.length) {
          // Roles removed
          pluginData.state.guildLogs.log(
            LogType.MEMBER_ROLE_REMOVE,
            {
              member: logMember,
              roles: removedRoles
                .map(roleId => pluginData.guild.roles.cache.get(roleId) || { id: roleId, name: `Unknown (${roleId})` })
                .map(r => r.name)
                .join(", "),
              mod: mod ? userToConfigAccessibleUser(mod) : {},
            },
            member.id,
          );
        }
      }
    }
  },
});

// TODO: Reimplement USERNAME_CHANGE
