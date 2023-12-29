import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { MuteTypes } from "../../../data/MuteTypes";
import { Mute } from "../../../data/entities/Mute";
import { clearExpiringMute } from "../../../data/loops/expiringMutesLoop";
import { resolveMember, verboseUserMention } from "../../../utils";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin";
import { MutesPluginType } from "../types";

export async function clearMute(
  pluginData: GuildPluginData<MutesPluginType>,
  mute: Mute | null = null,
  member: GuildMember | null = null,
) {
  if (mute) {
    clearExpiringMute(mute);
  }

  if (!member && mute) {
    member = await resolveMember(pluginData.client, pluginData.guild, mute.user_id, true);
  }

  if (member) {
    const lock = await pluginData.locks.acquire(memberRolesLock(member));
    const roleManagerPlugin = pluginData.getPlugin(RoleManagerPlugin);

    try {
      const defaultMuteRole = pluginData.config.get().mute_role;
      if (mute) {
        const muteRoleId = mute.mute_role || defaultMuteRole;

        if (mute.type === MuteTypes.Role) {
          if (muteRoleId) {
            roleManagerPlugin.removePriorityRole(member.id, muteRoleId);
          }
        } else {
          await member.timeout(null);
        }

        if (mute.roles_to_restore) {
          const guildRoles = pluginData.guild.roles.cache;
          for (const roleIdToRestore of mute?.roles_to_restore ?? []) {
            if (guildRoles.has(roleIdToRestore) && roleIdToRestore !== muteRoleId) {
              roleManagerPlugin.addRole(member.id, roleIdToRestore);
            }
          }
        }
      } else {
        // Unmuting someone without an active mute -> remove timeouts and/or mute role
        const muteRole = defaultMuteRole;
        if (muteRole && member.roles.cache.has(muteRole)) {
          roleManagerPlugin.removePriorityRole(member.id, muteRole);
        }
        if (member.isCommunicationDisabled()) {
          await member.timeout(null);
        }
      }
    } catch {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Failed to remove mute role from ${verboseUserMention(member.user)}`,
      });
    } finally {
      lock.unlock();
    }
  }

  if (mute) {
    await pluginData.state.mutes.clear(mute.user_id);
  }
}
