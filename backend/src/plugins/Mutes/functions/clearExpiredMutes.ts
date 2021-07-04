import { Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { resolveMember, stripObjectToScalars, UnknownUser } from "../../../utils";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { MutesPluginType } from "../types";

export async function clearExpiredMutes(pluginData: GuildPluginData<MutesPluginType>) {
  const expiredMutes = await pluginData.state.mutes.getExpiredMutes();
  for (const mute of expiredMutes) {
    const member = await resolveMember(pluginData.client, pluginData.guild, mute.user_id);

    if (member) {
      try {
        const lock = await pluginData.locks.acquire(memberRolesLock(member));

        const muteRole = pluginData.config.get().mute_role;
        if (muteRole) {
          await member.roles.remove(muteRole as Snowflake);
        }
        if (mute.roles_to_restore) {
          const guildRoles = pluginData.guild.roles.cache;
          let newRoles: string[] = member.roles.cache.keyArray();
          newRoles =
            muteRole && newRoles.includes(muteRole) ? newRoles.splice(newRoles.indexOf(muteRole), 1) : newRoles;
          for (const toRestore of mute.roles_to_restore) {
            if (guildRoles.has(toRestore as Snowflake) && toRestore !== muteRole) newRoles.push(toRestore);
          }
          await member.roles.set(newRoles as Snowflake[]);
        }

        lock.unlock();
      } catch {
        pluginData.state.serverLogs.log(LogType.BOT_ALERT, {
          body: `Failed to remove mute role from {userMention(member)}`,
          member: stripObjectToScalars(member),
        });
      }
    }

    await pluginData.state.mutes.clear(mute.user_id);

    pluginData.state.serverLogs.log(LogType.MEMBER_MUTE_EXPIRED, {
      member: member
        ? stripObjectToScalars(member, ["user", "roles"])
        : { id: mute.user_id, user: new UnknownUser({ id: mute.user_id }) },
    });

    pluginData.state.events.emit("unmute", mute.user_id);
  }
}
