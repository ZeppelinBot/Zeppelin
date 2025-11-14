import { PermissionFlagsBits, Snowflake } from "discord.js";
import { z } from "zod";
import { nonNullish, unique, zSnowflake } from "../../../utils.js";
import { canAssignRole } from "../../../utils/canAssignRole.js";
import { getMissingPermissions } from "../../../utils/getMissingPermissions.js";
import { missingPermissionError } from "../../../utils/missingPermissionError.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin.js";
import { ignoreRoleChange } from "../functions/ignoredRoleChanges.js";
import { automodAction } from "../helpers.js";

const p = PermissionFlagsBits;

const configSchema = z.array(zSnowflake);

export const AddRolesAction = automodAction({
  configSchema,

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

    const rolesToAssign: string[] = [];
    const rolesWeCannotAssign: string[] = [];
    for (const roleId of actionConfig) {
      if (canAssignRole(pluginData.guild, me, roleId)) {
        rolesToAssign.push(roleId);
      } else {
        rolesWeCannotAssign.push(roleId);
      }
    }

    if (rolesWeCannotAssign.length) {
      const roleNamesWeCannotAssign = rolesWeCannotAssign.map(
        (roleId) => pluginData.guild.roles.cache.get(roleId as Snowflake)?.name || roleId,
      );
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.logBotAlert({
        body: `Unable to assign the following roles in Automod rule **${ruleName}**: **${roleNamesWeCannotAssign.join(
          "**, **",
        )}**`,
      });
    }

    await Promise.all(
      members.map(async (member) => {
        const currentMemberRoles = new Set(member.roles.cache.keys());
        for (const roleId of rolesToAssign) {
          if (!currentMemberRoles.has(roleId)) {
            pluginData.getPlugin(RoleManagerPlugin).addRole(member.id, roleId);
            // TODO: Remove this and just ignore bot changes in general?
            ignoreRoleChange(pluginData, member.id, roleId);
          }
        }
      }),
    );
  },
});
