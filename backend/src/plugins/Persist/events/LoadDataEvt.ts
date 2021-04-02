import { persistEvt } from "../types";
import { Constants, MemberOptions } from "eris";
import intersection from "lodash.intersection";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars } from "../../../utils";
import { getMissingPermissions } from "../../../utils/getMissingPermissions";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { canAssignRole } from "../../../utils/canAssignRole";
import { memberRolesLock } from "../../../utils/lockNameHelpers";

const p = Constants.Permissions;

export const LoadDataEvt = persistEvt({
  event: "guildMemberAdd",

  async listener(meta) {
    const member = meta.args.member;
    const pluginData = meta.pluginData;

    const memberRoleLock = await pluginData.locks.acquire(memberRolesLock(member));

    const persistedData = await pluginData.state.persistedData.find(member.id);
    if (!persistedData) {
      memberRoleLock.unlock();
      return;
    }

    const toRestore: MemberOptions = {};
    const config = pluginData.config.getForMember(member);
    const restoredData: string[] = [];

    // Check permissions
    const me = pluginData.guild.members.get(pluginData.client.user.id)!;
    let requiredPermissions = 0;
    if (config.persist_nicknames) requiredPermissions |= p.manageNicknames;
    if (config.persisted_roles) requiredPermissions |= p.manageRoles;
    const missingPermissions = getMissingPermissions(me.permission, requiredPermissions);
    if (missingPermissions) {
      pluginData.getPlugin(LogsPlugin).log(LogType.BOT_ALERT, {
        body: `Missing permissions for persist plugin: ${missingPermissionError(missingPermissions)}`,
      });
      return;
    }

    // Check specific role permissions
    if (config.persisted_roles) {
      for (const roleId of config.persisted_roles) {
        if (!canAssignRole(pluginData.guild, me, roleId)) {
          pluginData.getPlugin(LogsPlugin).log(LogType.BOT_ALERT, {
            body: `Missing permissions to assign role \`${roleId}\` in persist plugin`,
          });
          return;
        }
      }
    }

    const persistedRoles = config.persisted_roles;
    if (persistedRoles.length) {
      const rolesToRestore = intersection(persistedRoles, persistedData.roles);

      if (rolesToRestore.length) {
        restoredData.push("roles");
        toRestore.roles = Array.from(new Set([...rolesToRestore, ...member.roles]));
      }
    }

    if (config.persist_nicknames && persistedData.nickname) {
      restoredData.push("nickname");
      toRestore.nick = persistedData.nickname;
    }

    if (restoredData.length) {
      await member.edit(toRestore, "Restored upon rejoin");
      await pluginData.state.persistedData.clear(member.id);

      pluginData.state.logs.log(LogType.MEMBER_RESTORE, {
        member: stripObjectToScalars(member, ["user", "roles"]),
        restoredData: restoredData.join(", "),
      });
    }

    memberRoleLock.unlock();
  },
});
