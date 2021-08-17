import { GuildAuditLogs } from "discord.js";
import diff from "lodash.difference";
import isEqual from "lodash.isequal";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogType } from "../../../data/LogType";
import { safeFindRelevantAuditLogEntry } from "../../../utils/safeFindRelevantAuditLogEntry";
import { logsEvt } from "../types";
import { logMemberNickChange } from "../logFunctions/logMemberNickChange";
import { logMemberRoleChanges } from "../logFunctions/logMemberRoleChanges";
import { logMemberRoleAdd } from "../logFunctions/logMemberRoleAdd";
import { logMemberRoleRemove } from "../logFunctions/logMemberRoleRemove";

export const LogsGuildMemberUpdateEvt = logsEvt({
  event: "guildMemberUpdate",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const oldMember = meta.args.oldMember;
    const member = meta.args.newMember;

    if (!oldMember) return;

    if (member.nickname !== oldMember.nickname) {
      logMemberNickChange(pluginData, {
        member,
        oldNick: oldMember.nickname != null ? oldMember.nickname : "<none>",
        newNick: member.nickname != null ? member.nickname : "<none>",
      });
    }

    if (!isEqual(oldMember.roles, member.roles)) {
      const addedRoles = diff([...member.roles.cache.keys()], [...oldMember.roles.cache.keys()]);
      const removedRoles = diff([...oldMember.roles.cache.keys()], [...member.roles.cache.keys()]);
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
        const mod = relevantAuditLogEntry?.executor ?? null;

        if (addedRoles.length && removedRoles.length) {
          // Roles added *and* removed
          logMemberRoleChanges(pluginData, {
            member,
            addedRoles: addedRoles
              .map(roleId => pluginData.guild.roles.cache.get(roleId) ?? { id: roleId, name: `Unknown (${roleId})` })
              .map(r => r.name)
              .join(", "),
            removedRoles: removedRoles
              .map(roleId => pluginData.guild.roles.cache.get(roleId) ?? { id: roleId, name: `Unknown (${roleId})` })
              .map(r => r.name)
              .join(", "),
            mod,
          });
        } else if (addedRoles.length) {
          // Roles added
          logMemberRoleAdd(pluginData, {
            member,
            roles: addedRoles
              .map(roleId => pluginData.guild.roles.cache.get(roleId) ?? { id: roleId, name: `Unknown (${roleId})` })
              .map(r => r.name)
              .join(", "),
            mod,
          });
        } else if (removedRoles.length && !addedRoles.length) {
          // Roles removed
          logMemberRoleRemove(pluginData, {
            member,
            roles: removedRoles
              .map(roleId => pluginData.guild.roles.cache.get(roleId) ?? { id: roleId, name: `Unknown (${roleId})` })
              .map(r => r.name)
              .join(", "),
            mod,
          });
        }
      }
    }
  },
});

// TODO: Reimplement USERNAME_CHANGE
