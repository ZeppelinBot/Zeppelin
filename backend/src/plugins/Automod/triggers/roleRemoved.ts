import { Snowflake } from "discord.js";
import * as t from "io-ts";
import { consumeIgnoredRoleChange } from "../functions/ignoredRoleChanges";
import { automodTrigger } from "../helpers";

interface RoleAddedMatchResult {
  matchedRoleId: string;
}

export const RoleRemovedTrigger = automodTrigger<RoleAddedMatchResult>()({
  configType: t.union([t.string, t.array(t.string)]),

  defaultConfig: "",

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
    const memberName = `**${member.user.username}#${member.user.discriminator}** (\`${member.id}\`)`;
    return `Role ${roleName} (\`${matchResult.extra.matchedRoleId}\`) was removed from ${memberName}`;
  },
});
