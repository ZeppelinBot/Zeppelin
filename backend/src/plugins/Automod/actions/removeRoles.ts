import { PermissionFlagsBits, Snowflake } from "discord.js";
import { z } from "zod";
import { nonNullish, unique, zSnowflake } from "../../../utils.js";
import { canAssignRole } from "../../../utils/canAssignRole.js";
import { getMissingPermissions } from "../../../utils/getMissingPermissions.js";
import { memberRolesLock } from "../../../utils/lockNameHelpers.js";
import { missingPermissionError } from "../../../utils/missingPermissionError.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { ignoreRoleChange } from "../functions/ignoredRoleChanges.js";
import { automodAction } from "../helpers.js";

const p = PermissionFlagsBits;

export const RemoveRolesAction = automodAction({
  configSchema: z.array(zSnowflake).default([]),

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    const members = unique(contexts.map((c) => c.member).filter(nonNullish));
    const me = pluginData.guild.members.cache.get(pluginData.client.user!.id)!;

    const missingPermissions = getMissingPermissions(me.permissions, p.ManageRoles);
    if (missingPermissions) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.logBotAlert({
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
        (roleId) => pluginData.guild.roles.cache.get(roleId as Snowflake)?.name || roleId,
      );
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.logBotAlert({
        body: `Unable to remove the following roles in Automod rule **${ruleName}**: **${roleNamesWeCannotRemove.join(
          "**, **",
        )}**`,
      });
    }

    await Promise.all(
      members.map(async (member) => {
        const memberRoles = new Set(member.roles.cache.keys());
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
