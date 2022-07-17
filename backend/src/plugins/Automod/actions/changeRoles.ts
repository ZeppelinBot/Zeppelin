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
    const me = pluginData.guild.me ?? (await pluginData.guild.members.fetch(pluginData.client.user!.id));

    const missingPermissions = getMissingPermissions(me.permissions, Permissions.FLAGS.MANAGE_ROLES);
    if (missingPermissions) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.logBotAlert({
        body: `Cannot edit roles in Automod rule **${ruleName}**. ${missingPermissionError(missingPermissions)}`,
      });
      return;
    }

    const rolesToAssign: Snowflake[] = [];
    const rolesWeCannotAssign: Snowflake[] = [];
    const rolesToRemove: Snowflake[] = [];
    const rolesWeCannotRemove: Snowflake[] = [];
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

    if (rolesWeCannotAssign.length || rolesWeCannotRemove.length) {
      const mapFn = (roleId: Snowflake) => pluginData.guild.roles.cache.get(roleId)?.name || roleId;
      const roleNamesWeCannotAssign = rolesWeCannotAssign.map(mapFn);
      const roleNamesWeCannotRemove = rolesWeCannotRemove.map(mapFn);
      const logs = pluginData.getPlugin(LogsPlugin);
      let body = `Unable to change roles in Automod rule **${ruleName}**:`;
      if (roleNamesWeCannotAssign.length) body += `\n**Add:** ${roleNamesWeCannotAssign.join("**, **")}}`;
      if (roleNamesWeCannotRemove.length) body += `\n**Remove:** ${roleNamesWeCannotRemove.join("**, **")}}`;
      logs.logBotAlert({ body });
    }

    await Promise.all(
      members.map(async member => {
        const memberRoles = new Set(member.roles.cache.keys());
        for (const roleId of rolesToAssign) {
          memberRoles.add(roleId);
          ignoreRoleChange(pluginData, member.id, roleId);
        }
        for (const roleId of rolesToRemove) {
          memberRoles.delete(roleId);
          ignoreRoleChange(pluginData, member.id, roleId);
        }

        if (isEqual(Array.from(memberRoles), Array.from(member.roles.cache.keys()))) {
          // No role changes
          return;
        }

        const memberRoleLock = await pluginData.locks.acquire(memberRolesLock(member));

        const rolesArr = Array.from(memberRoles.values());
        await member.roles.set(rolesArr);

        memberRoleLock.unlock();
      }),
    );
  },
});
