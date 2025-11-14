import { Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { logger } from "../../../logger.js";
import { renderUsername, resolveMember } from "../../../utils.js";
import { memberRolesLock } from "../../../utils/lockNameHelpers.js";
import { PendingMemberRoleChanges, ReactionRolesPluginType, RoleChangeMode } from "../types.js";

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
          const newRoleIds = new Set(member.roles.cache.keys());
          for (const change of newPendingRoleChangeObj.changes) {
            if (change.mode === "+") newRoleIds.add(change.roleId as Snowflake);
            else newRoleIds.delete(change.roleId as Snowflake);
          }

          try {
            await member.roles.set(Array.from(newRoleIds.values()), "Reaction roles");
          } catch (e) {
            logger.warn(`Failed to apply role changes to ${renderUsername(member)} (${member.id}): ${e.message}`);
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
