import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogType } from "../../../data/LogType";
import { nonNullish, unique } from "../../../utils";
import { Constants } from "eris";
import { hasDiscordPermissions } from "../../../utils/hasDiscordPermissions";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { getMissingPermissions } from "../../../utils/getMissingPermissions";
import { canAssignRole } from "../../../utils/canAssignRole";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { ignoreRoleChange } from "../functions/ignoredRoleChanges";
import { memberRolesLock } from "../../../utils/lockNameHelpers";

const p = Constants.Permissions;

export const AddRolesAction = automodAction({
  configType: t.array(t.string),
  defaultConfig: [],

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    const members = unique(contexts.map(c => c.member).filter(nonNullish));
    const me = pluginData.guild.members.get(pluginData.client.user.id)!;

    const missingPermissions = getMissingPermissions(me.permission, p.manageRoles);
    if (missingPermissions) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.log(LogType.BOT_ALERT, {
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
        roleId => pluginData.guild.roles.get(roleId)?.name || roleId,
      );
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.log(LogType.BOT_ALERT, {
        body: `Unable to assign the following roles in Automod rule **${ruleName}**: **${roleNamesWeCannotAssign.join(
          "**, **",
        )}**`,
      });
    }

    await Promise.all(
      members.map(async member => {
        const memberRoles = new Set(member.roles);
        for (const roleId of rolesToAssign) {
          memberRoles.add(roleId);
          ignoreRoleChange(pluginData, member.id, roleId);
        }

        if (memberRoles.size === member.roles.length) {
          // No role changes
          return;
        }

        const memberRoleLock = await pluginData.locks.acquire(memberRolesLock(member));

        const rolesArr = Array.from(memberRoles.values());
        await member.edit({
          roles: rolesArr,
        });
        member.roles = rolesArr; // Make sure we know of the new roles internally as well

        memberRoleLock.unlock();
      }),
    );
  },
});
