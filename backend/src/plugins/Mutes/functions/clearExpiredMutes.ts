import { GuildPluginData } from "knub";
import { MutesPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { resolveMember, stripObjectToScalars, UnknownUser } from "../../../utils";
import { MemberOptions } from "eris";

export async function clearExpiredMutes(pluginData: GuildPluginData<MutesPluginType>) {
  const expiredMutes = await pluginData.state.mutes.getExpiredMutes();
  for (const mute of expiredMutes) {
    const member = await resolveMember(pluginData.client, pluginData.guild, mute.user_id);

    if (member) {
      try {
        const muteRole = pluginData.config.get().mute_role;
        if (muteRole) {
          await member.removeRole(muteRole);
        }
        if (mute.roles_to_restore) {
          const memberOptions: MemberOptions = {};
          memberOptions.roles = Array.from(
            new Set([...mute.roles_to_restore, ...member.roles.filter(x => x !== muteRole)]),
          );
          member.edit(memberOptions);
        }
      } catch (e) {
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
  }
}
