import { Mute } from "../../../data/entities/Mute";
import { resolveMember, verboseUserMention } from "../../../utils";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { GuildPluginData } from "knub";
import { MutesPluginType } from "../types";
import { clearExpiringMute } from "../../../data/loops/expiringMutesLoop";
import { GuildMember } from "discord.js";

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
      const muteRole = pluginData.config.get().mute_role;
      if (muteRole) {
        await member.roles.remove(muteRole);
      }
      if (mute?.roles_to_restore) {
        const guildRoles = pluginData.guild.roles.cache;
        const newRoles = [...member.roles.cache.keys()].filter((roleId) => roleId !== muteRole);
        for (const toRestore of mute?.roles_to_restore) {
          if (guildRoles.has(toRestore) && toRestore !== muteRole && !newRoles.includes(toRestore)) {
            newRoles.push(toRestore);
          }
        }
        await member.roles.set(newRoles);
      }

      lock.unlock();
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
