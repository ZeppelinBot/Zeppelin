import { GuildPluginData } from "knub";
import { MINUTES, resolveMember, UnknownUser, verboseUserMention } from "../../../utils";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { MutesPluginType } from "../types";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { Mute } from "src/data/entities/Mute";
import moment from "moment";
import { addTimer } from "src/utils/timers";

const LOAD_LESS_THAN_MIN_COUNT = 60 * MINUTES;

export async function loadExpiringTimers(pluginData: GuildPluginData<MutesPluginType>) {
  const now = moment.utc().toDate().getTime();
  pluginData.state.timers = pluginData.state.timers.filter((tm) => !tm.done || !tm.timeout);
  const mutes = (await pluginData.state.mutes.getAllTemporaryMutes()).filter((m) => m.expires_at);
  const expiredMutes = mutes.filter((m) => now >= moment(m.expires_at!).toDate().getTime());
  const expiringMutes = mutes.filter(
    (m) => !expiredMutes.find((exp) => exp.user_id === m.user_id && exp.guild_id === m.guild_id),
  );

  for (const mute of expiringMutes) {
    const expires = moment(mute.expires_at!).toDate().getTime();
    if (expires <= now) continue; // exclude expired mutes, just in case
    if (expires > now + LOAD_LESS_THAN_MIN_COUNT) continue; // exclude timers that are expiring in over 180 mins

    addTimer(pluginData, mute, async () => {
      await clearExpiredMute(pluginData, mute);
    });
  }

  for (const mute of expiredMutes) {
    await clearExpiredMute(pluginData, mute);
  }
}

export async function clearExpiredMute(pluginData: GuildPluginData<MutesPluginType>, mute: Mute) {
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
