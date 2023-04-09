import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { Mute } from "../../../data/entities/Mute";
import { clearExpiringMute } from "../../../data/loops/expiringMutesLoop";
import { MuteTypes } from "../../../data/MuteTypes";
import { resolveMember, verboseUserMention } from "../../../utils";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { LogsPlugin } from "../../Logs/LogsPlugin";
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

    try {
      const defaultMuteRole = pluginData.config.get().mute_role;
      if (mute) {
        const muteRole = mute.mute_role || pluginData.config.get().mute_role;

        if (mute.type === MuteTypes.Role) {
          if (muteRole) {
            await member.roles.remove(muteRole);
          }
        } else {
          await member.timeout(null);
        }

        if (mute.roles_to_restore) {
          const guildRoles = pluginData.guild.roles.cache;
          const newRoles = [...member.roles.cache.keys()].filter((roleId) => roleId !== muteRole);
          for (const toRestore of mute?.roles_to_restore) {
            if (guildRoles.has(toRestore) && toRestore !== muteRole && !newRoles.includes(toRestore)) {
              newRoles.push(toRestore);
            }
          }
          await member.roles.set(newRoles);
        }
      } else {
        // Unmuting someone without an active mute -> remove timeouts and/or mute role
        const muteRole = pluginData.config.get().mute_role;
        if (muteRole && member.roles.cache.has(muteRole)) {
          await member.roles.remove(muteRole);
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
