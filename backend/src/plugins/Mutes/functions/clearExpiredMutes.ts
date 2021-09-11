import { Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogType } from "../../../data/LogType";
import { resolveMember, UnknownUser, verboseUserMention } from "../../../utils";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { MutesPluginType } from "../types";
import { LogsPlugin } from "../../Logs/LogsPlugin";

export async function clearExpiredMutes(pluginData: GuildPluginData<MutesPluginType>) {
  const expiredMutes = await pluginData.state.mutes.getExpiredMutes();
  for (const mute of expiredMutes) {
    const member = await resolveMember(pluginData.client, pluginData.guild, mute.user_id, true);

    if (member) {
      try {
        const lock = await pluginData.locks.acquire(memberRolesLock(member));

        const muteRole = pluginData.config.get().mute_role;
        if (muteRole) {
          await member.roles.remove(muteRole);
        }
        if (mute.roles_to_restore) {
          const guildRoles = pluginData.guild.roles.cache;
          const newRoles = [...member.roles.cache.keys()].filter((roleId) => roleId !== muteRole);
          for (const toRestore of mute.roles_to_restore) {
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
      }
    }

    await pluginData.state.mutes.clear(mute.user_id);

    pluginData.getPlugin(LogsPlugin).logMemberMuteExpired({
      member: member || new UnknownUser({ id: mute.user_id }),
    });

    pluginData.state.events.emit("unmute", mute.user_id);
  }
}
