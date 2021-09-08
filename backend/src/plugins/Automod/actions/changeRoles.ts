import { Permissions, Snowflake } from "discord.js";
import * as t from "io-ts";
import isEqual from "lodash.isequal";
import { nonNullish, unique } from "../../../utils";
import { canAssignRole } from "../../../utils/canAssignRole";
import { getMissingPermissions } from "../../../utils/getMissingPermissions";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { ignoreRoleChange } from "../functions/ignoredRoleChanges";
import { automodAction } from "../helpers";

const p = Permissions.FLAGS;

export const ChangeRolesAction = automodAction({
  configType: t.type({
    add: t.array(t.string),
    remove: t.array(t.string),
  }),
  defaultConfig: {
    add: [],
    remove: [],
  },

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    const members = unique(contexts.map(c => c.member).filter(nonNullish));
    const me = pluginData.guild.members.cache.get(pluginData.client.user!.id)!;

    const missingPermissions = getMissingPermissions(me.permissions, p.MANAGE_ROLES);
    if (missingPermissions) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.logBotAlert({
        body: `Cannot edit roles in Automod rule **${ruleName}**. ${missingPermissionError(missingPermissions)}`,
      });
      return;
    }

    const rolesToAssign: string[] = [];
    const rolesWeCannotAssign: string[] = [];
    const rolesToRemove: string[] = [];
    const rolesWeCannotRemove: string[] = [];
    for (const roleId of actionConfig.add) {
      if (canAssignRole(pluginData.guild, me, roleId)) {
        rolesToAssign.push(roleId);
      } else {
        rolesWeCannotAssign.push(roleId);
      }
    }
    for (const roleId of actionConfig.remove) {
      if (canAssignRole(pluginData.guild, me, roleId)) {
        rolesToRemove.push(roleId);
      } else {
        rolesWeCannotRemove.push(roleId);
      }
    }

    if (rolesWeCannotAssign.length) {
      const roleNamesWeCannotAssign = rolesWeCannotAssign.map(
        roleId => pluginData.guild.roles.cache.get(roleId as Snowflake)?.name || roleId,
      );
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.logBotAlert({
        body: `Unable to assign the following roles in Automod rule **${ruleName}**: **${roleNamesWeCannotAssign.join(
          "**, **",
        )}**`,
      });
    }

    if (rolesWeCannotRemove.length) {
      const roleNamesWeCannotRemove = rolesWeCannotRemove.map(
        roleId => pluginData.guild.roles.cache.get(roleId as Snowflake)?.name || roleId,
      );
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.logBotAlert({
        body: `Unable to remove the following roles in Automod rule **${ruleName}**: **${roleNamesWeCannotRemove.join(
          "**, **",
        )}**`,
      });
      return;
    }

    await Promise.all(
      members.map(async member => {
        const memberRoles = new Set(member.roles.cache.keys());
        for (const roleId of rolesToAssign) {
          memberRoles.add(roleId as Snowflake);
          ignoreRoleChange(pluginData, member.id, roleId);
        }
        for (const roleId of rolesToRemove) {
          memberRoles.delete(roleId as Snowflake);
          ignoreRoleChange(pluginData, member.id, roleId);
        }

        if (isEqual(memberRoles, member.roles.cache.keys())) {
          // No role changes
          return;
        }

        const memberRoleLock = await pluginData.locks.acquire(memberRolesLock(member));

        const rolesArr = Array.from(memberRoles.values());
        await member.edit({
          roles: rolesArr,
        });

        memberRoleLock.unlock();
      }),
    );
  },
});
