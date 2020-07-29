import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogType } from "../../../data/LogType";
import { asyncMap, resolveMember, tNullable, unique } from "../../../utils";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin";

export const AddRolesAction = automodAction({
  configType: t.array(t.string),

  async apply({ pluginData, contexts, actionConfig }) {
    const members = unique(contexts.map(c => c.member).filter(Boolean));

    await Promise.all(
      members.map(async member => {
        const memberRoles = new Set(member.roles);
        for (const roleId of actionConfig) {
          memberRoles.add(roleId);
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
