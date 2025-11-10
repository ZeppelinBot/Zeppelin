import { Snowflake } from "discord.js";
import { z } from "zod";
import { renderUsername, zSnowflake } from "../../../utils.js";
import { consumeIgnoredRoleChange } from "../functions/ignoredRoleChanges.js";
import { automodTrigger } from "../helpers.js";

interface RoleAddedMatchResult {
  matchedRoleId: string;
}

const configSchema = z.union([zSnowflake, z.array(zSnowflake).max(255)]).default([]);

export const RoleRemovedTrigger = automodTrigger<RoleAddedMatchResult>()({
  configSchema,

  async match({ triggerConfig, context, pluginData }) {
    if (!context.member || !context.rolesChanged || context.rolesChanged.removed!.length === 0) {
      return;
    }

    const triggerRoles = Array.isArray(triggerConfig) ? triggerConfig : [triggerConfig];
    for (const roleId of triggerRoles) {
      if (consumeIgnoredRoleChange(pluginData, context.member.id, roleId)) {
        continue;
      }

      if (context.rolesChanged.removed!.includes(roleId)) {
        return {
          extra: {
            matchedRoleId: roleId,
          },
        };
      }
    }
  },

  renderMatchInformation({ matchResult, pluginData, contexts }) {
    const role = pluginData.guild.roles.cache.get(matchResult.extra.matchedRoleId as Snowflake);
    const roleName = role?.name || "Unknown";
    const member = contexts[0].member!;
    const memberName = `**${renderUsername(member)}** (\`${member.id}\`)`;
    return `Role ${roleName} (\`${matchResult.extra.matchedRoleId}\`) was removed from ${memberName}`;
  },
});
