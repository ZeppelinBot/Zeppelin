import { GuildPluginData } from "knub";
import { ReactionRolesPluginType, RoleChangeMode, PendingMemberRoleChanges } from "../types";
import { resolveMember } from "../../../utils";
import { logger } from "../../../logger";
import { renderTemplate } from "../../../templateFormatter";

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

        const lock = await pluginData.locks.acquire(`member-roles-${memberId}`);

        const member = await resolveMember(pluginData.client, pluginData.guild, memberId);
        if (member) {
          const oldRoles = member.roles;
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

          const cfg = pluginData.config.getForMember(member);
          if (cfg.dm_on_change) {
            const addedRoles: string[] = [];
            const removedRoles: string[] = [];
            for (const change of newPendingRoleChangeObj.changes) {
              const roleName = pluginData.guild.roles.get(change.roleId)?.name ?? "";
              if (change.mode === "+" && !oldRoles.includes(change.roleId)) addedRoles.push(roleName);
              else if (change.mode === "-" && oldRoles.includes(change.roleId)) removedRoles.push(roleName);
            }

            if (addedRoles.length === 0 && removedRoles.length === 0) return; // Reaction that caused no change

            const dmMessage = await renderTemplate(cfg.change_message, {
              guildName: pluginData.guild.name,
              addedRoles: addedRoles.length >= 1 ? addedRoles.join(", ") : "None",
              removedRoles: removedRoles.length >= 1 ? removedRoles.join(", ") : "None",
            });

            try {
              const dms = await member.user.getDMChannel();
              await dms.createMessage(dmMessage);
            } catch (e) {
              // We are probably blocked or privacy is too high, ignore silently
            }
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
