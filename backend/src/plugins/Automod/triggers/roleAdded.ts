import { Snowflake } from "discord.js";
import * as t from "io-ts";
import { consumeIgnoredRoleChange } from "../functions/ignoredRoleChanges";
import { automodTrigger } from "../helpers";

interface RoleAddedMatchResult {
  matchedRoleId: string;
}

export const RoleAddedTrigger = automodTrigger<RoleAddedMatchResult>()({
  configType: t.union([t.string, t.array(t.string)]),

  defaultConfig: "",

  async match({ triggerConfig, context, pluginData }) {
    if (!context.member || !context.rolesChanged || context.rolesChanged.added!.length === 0) {
      return;
    }

    const triggerRoles = Array.isArray(triggerConfig) ? triggerConfig : [triggerConfig];
    for (const roleId of triggerRoles) {
      if (context.rolesChanged.added!.includes(roleId)) {
        if (consumeIgnoredRoleChange(pluginData, context.member.id, roleId)) {
          continue;
        }

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
    return `Role ${roleName} (\`${matchResult.extra.matchedRoleId}\`) was added to ${memberName}`;
  },
});
