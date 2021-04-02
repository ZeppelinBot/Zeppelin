import { GuildPluginData } from "knub";
import { ReactionRolesPluginType, RoleChangeMode, PendingMemberRoleChanges } from "../types";
import { resolveMember } from "../../../utils";
import { logger } from "../../../logger";
import { memberRolesLock } from "../../../utils/lockNameHelpers";

const ROLE_CHANGE_BATCH_DEBOUNCE_TIME = 1500;

export async function addMemberPendingRoleChange(
  pluginData: GuildPluginData<ReactionRolesPluginType>,
  memberId: string,
  mode: RoleChangeMode,
  roleId: string,
) {
  if (!pluginData.state.pendingRoleChanges.has(memberId)) {
    const newPendingRoleChangeObj: PendingMemberRoleChanges = {
      timeout: null,
      changes: [],
      applyFn: async () => {
        pluginData.state.pendingRoleChanges.delete(memberId);

        const lock = await pluginData.locks.acquire(memberRolesLock({ id: memberId }));

        const member = await resolveMember(pluginData.client, pluginData.guild, memberId);
        if (member) {
          const newRoleIds = new Set(member.roles);
          for (const change of newPendingRoleChangeObj.changes) {
            if (change.mode === "+") newRoleIds.add(change.roleId);
            else newRoleIds.delete(change.roleId);
          }

          try {
            await member.edit(
              {
                roles: Array.from(newRoleIds.values()),
              },
              "Reaction roles",
            );
          } catch (e) {
            logger.warn(
              `Failed to apply role changes to ${member.username}#${member.discriminator} (${member.id}): ${e.message}`,
            );
          }
        }
        lock.unlock();
      },
    };

    pluginData.state.pendingRoleChanges.set(memberId, newPendingRoleChangeObj);
  }

  const pendingRoleChangeObj = pluginData.state.pendingRoleChanges.get(memberId)!;
  pendingRoleChangeObj.changes.push({ mode, roleId });

  if (pendingRoleChangeObj.timeout) clearTimeout(pendingRoleChangeObj.timeout);
  pendingRoleChangeObj.timeout = setTimeout(
    () => pluginData.state.roleChangeQueue.add(pendingRoleChangeObj.applyFn),
    ROLE_CHANGE_BATCH_DEBOUNCE_TIME,
  );
}
