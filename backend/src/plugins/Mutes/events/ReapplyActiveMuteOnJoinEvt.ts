import { mutesEvt } from "../types";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars } from "../../../utils";
import { memberRolesLock } from "../../../utils/lockNameHelpers";

/**
 * Reapply active mutes on join
 */
export const ReapplyActiveMuteOnJoinEvt = mutesEvt("guildMemberAdd", async ({ pluginData, args: { member } }) => {
  const mute = await pluginData.state.mutes.findExistingMuteForUserId(member.id);
  if (mute) {
    const muteRole = pluginData.config.get().mute_role;

    if (muteRole) {
      const memberRoleLock = await pluginData.locks.acquire(memberRolesLock(member));
      await member.addRole(muteRole);
      memberRoleLock.unlock();
    }

    pluginData.state.serverLogs.log(LogType.MEMBER_MUTE_REJOIN, {
      member: stripObjectToScalars(member, ["user", "roles"]),
    });
  }
});
