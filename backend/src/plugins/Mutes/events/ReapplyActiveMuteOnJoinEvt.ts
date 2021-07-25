import { Snowflake } from "discord.js";
import { memberToConfigAccessibleMember } from "../../../utils/configAccessibleObjects";
import { LogType } from "../../../data/LogType";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { mutesEvt } from "../types";

/**
 * Reapply active mutes on join
 */
export const ReapplyActiveMuteOnJoinEvt = mutesEvt({
  event: "guildMemberAdd",
  async listener({ pluginData, args: { member } }) {
    const mute = await pluginData.state.mutes.findExistingMuteForUserId(member.id);
    if (mute) {
      const muteRole = pluginData.config.get().mute_role;

      if (muteRole) {
        const memberRoleLock = await pluginData.locks.acquire(memberRolesLock(member));
        await member.roles.add(muteRole as Snowflake);
        memberRoleLock.unlock();
      }

      pluginData.state.serverLogs.log(LogType.MEMBER_MUTE_REJOIN, {
        member: memberToConfigAccessibleMember(member),
      });
    }
  },
});
