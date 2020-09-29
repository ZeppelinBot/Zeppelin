import { eventListener } from "knub";
import { MutesPluginType } from "../types";
import { LogType } from "src/data/LogType";
import { stripObjectToScalars } from "src/utils";

/**
 * Reapply active mutes on join
 */
export const ReapplyActiveMuteOnJoinEvt = eventListener<MutesPluginType>()(
  "guildMemberAdd",
  async ({ pluginData, args: { member } }) => {
    const mute = await pluginData.state.mutes.findExistingMuteForUserId(member.id);
    if (mute) {
      const muteRole = pluginData.config.get().mute_role;

      const memberRolesLock = await pluginData.locks.acquire(`member-roles-${member.id}`);
      await member.addRole(muteRole);
      memberRolesLock.unlock();

      pluginData.state.serverLogs.log(LogType.MEMBER_MUTE_REJOIN, {
        member: stripObjectToScalars(member, ["user", "roles"]),
      });
    }
  },
);
