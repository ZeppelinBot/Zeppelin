import { Permissions, Snowflake } from "discord.js";
import * as t from "io-ts";
import { LogType } from "../../../data/LogType";
import { nonNullish, unique } from "../../../utils";
import { canAssignRole } from "../../../utils/canAssignRole";
import { getMissingPermissions } from "../../../utils/getMissingPermissions";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { ignoreRoleChange } from "../functions/ignoredRoleChanges";
import { automodAction } from "../helpers";

const p = Permissions.FLAGS;

export const RemoveRolesAction = automodAction({
  configType: t.array(t.string),

  defaultConfig: [],

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    const members = unique(contexts.map(c => c.member).filter(nonNullish));
    const me = pluginData.guild.members.cache.get(pluginData.client.user!.id)!;

    const missingPermissions = getMissingPermissions(me.permissions, p.MANAGE_ROLES);
    if (missingPermissions) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.log(LogType.BOT_ALERT, {
        body: `Cannot add roles in Automod rule **${ruleName}**. ${missingPermissionError(missingPermissions)}`,
      });
      return;
    }

    const rolesToRemove: string[] = [];
    const rolesWeCannotRemove: string[] = [];
    for (const roleId of actionConfig) {
      if (canAssignRole(pluginData.guild, me, roleId)) {
        rolesToRemove.push(roleId);
      } else {
        rolesWeCannotRemove.push(roleId);
      }
    }

    if (rolesWeCannotRemove.length) {
      const roleNamesWeCannotRemove = rolesWeCannotRemove.map(
        roleId => pluginData.guild.roles.cache.get(roleId as Snowflake)?.name || roleId,
      );
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.log(LogType.BOT_ALERT, {
        body: `Unable to remove the following roles in Automod rule **${ruleName}**: **${roleNamesWeCannotRemove.join(
          "**, **",
        )}**`,
      });
    }

    await Promise.all(
      members.map(async member => {
        const memberRoles = new Set(member.roles.cache.keyArray());
        for (const roleId of rolesToRemove) {
          memberRoles.delete(roleId as Snowflake);
          ignoreRoleChange(pluginData, member.id, roleId);
        }

        if (memberRoles.size === member.roles.cache.size) {
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
