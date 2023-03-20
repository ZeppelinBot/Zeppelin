import diff from "lodash.difference";
import isEqual from "lodash.isequal";
import { LogType } from "../../../data/LogType";
import { logMemberNickChange } from "../logFunctions/logMemberNickChange";
import { logMemberRoleAdd } from "../logFunctions/logMemberRoleAdd";
import { logMemberRoleChanges } from "../logFunctions/logMemberRoleChanges";
import { logMemberRoleRemove } from "../logFunctions/logMemberRoleRemove";
import { logsEvt } from "../types";

export const LogsGuildMemberUpdateEvt = logsEvt({
  event: "guildMemberUpdate",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const oldMember = meta.args.oldMember;
    const member = meta.args.newMember;
    const oldRoles = [...oldMember.roles.cache.keys()];
    const currentRoles = [...member.roles.cache.keys()];

    if (!oldMember || oldMember.partial) {
      return;
    }

    if (member.nickname !== oldMember.nickname) {
      logMemberNickChange(pluginData, {
        member,
        oldNick: oldMember.nickname != null ? oldMember.nickname : "<none>",
        newNick: member.nickname != null ? member.nickname : "<none>",
      });
    }

    if (!isEqual(oldRoles, currentRoles)) {
      const addedRoles = diff(currentRoles, oldRoles);
      const removedRoles = diff(oldRoles, currentRoles);
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
        if (addedRoles.length && removedRoles.length) {
          // Roles added *and* removed
          logMemberRoleChanges(pluginData, {
            member,
            addedRoles: addedRoles.map(
              (roleId) => pluginData.guild.roles.cache.get(roleId) ?? { id: roleId, name: `Unknown (${roleId})` },
            ),
            removedRoles: removedRoles.map(
              (roleId) => pluginData.guild.roles.cache.get(roleId) ?? { id: roleId, name: `Unknown (${roleId})` },
            ),
            mod: null,
          });
        } else if (addedRoles.length) {
          // Roles added
          logMemberRoleAdd(pluginData, {
            member,
            roles: addedRoles.map(
              (roleId) => pluginData.guild.roles.cache.get(roleId) ?? { id: roleId, name: `Unknown (${roleId})` },
            ),
            mod: null,
          });
        } else if (removedRoles.length && !addedRoles.length) {
          // Roles removed
          logMemberRoleRemove(pluginData, {
            member,
            roles: removedRoles.map(
              (roleId) => pluginData.guild.roles.cache.get(roleId) ?? { id: roleId, name: `Unknown (${roleId})` },
            ),
            mod: null,
          });
        }
      }
    }
  },
});

// TODO: Reimplement USERNAME_CHANGE
