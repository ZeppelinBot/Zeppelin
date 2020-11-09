import * as t from "io-ts";
import { automodTrigger } from "../helpers";
import { consumeIgnoredRoleChange } from "../functions/ignoredRoleChanges";

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
    const role = pluginData.guild.roles.get(matchResult.extra.matchedRoleId);
    const roleName = role?.name || "Unknown";
    const member = contexts[0].member!;
    const memberName = `**${member.user.username}#${member.user.discriminator}** (\`${member.id}\`)`;
    return `Role ${roleName} (\`${matchResult.extra.matchedRoleId}\`) was added to ${memberName}`;
  },
});
