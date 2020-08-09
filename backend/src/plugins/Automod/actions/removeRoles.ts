import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogType } from "../../../data/LogType";
import { asyncMap, resolveMember, tNullable, unique } from "../../../utils";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin";
import { getMissingPermissions } from "../../../utils/getMissingPermissions";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { canAssignRole } from "../../../utils/canAssignRole";
import { Constants } from "eris";
import { ignoreRoleChange } from "../functions/ignoredRoleChanges";

const p = Constants.Permissions;

export const RemoveRolesAction = automodAction({
  configType: t.array(t.string),

  defaultConfig: [],

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    const members = unique(contexts.map(c => c.member).filter(Boolean));
    const me = pluginData.guild.members.get(pluginData.client.user.id);

    const missingPermissions = getMissingPermissions(me.permission, p.manageRoles);
    if (missingPermissions) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.log(LogType.BOT_ALERT, {
        body: `Cannot add roles in Automod rule **${ruleName}**. ${missingPermissionError(missingPermissions)}`,
      });
      return;
    }

    const rolesToRemove = [];
    const rolesWeCannotRemove = [];
    for (const roleId of actionConfig) {
      if (canAssignRole(pluginData.guild, me, roleId)) {
        rolesToRemove.push(roleId);
      } else {
        rolesWeCannotRemove.push(roleId);
      }
    }

    if (rolesWeCannotRemove.length) {
      const roleNamesWeCannotRemove = rolesWeCannotRemove.map(
        roleId => pluginData.guild.roles.get(roleId)?.name || roleId,
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
        const memberRoles = new Set(member.roles);
        for (const roleId of rolesToRemove) {
          memberRoles.delete(roleId);
          ignoreRoleChange(pluginData, member.id, roleId);
        }

        if (memberRoles.size === member.roles.length) {
          // No role changes
          return;
        }

        const rolesArr = Array.from(memberRoles.values());
        await member.edit({
          roles: rolesArr,
        });
        member.roles = rolesArr; // Make sure we know of the new roles internally as well
      }),
    );
  },
});
