import { Snowflake } from "discord.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogType } from "../../../data/LogType";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { mutesEvt } from "../types";
import { LogsPlugin } from "../../Logs/LogsPlugin";

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

      pluginData.getPlugin(LogsPlugin).logMemberMuteRejoin({
        member,
      });
    }
  },
});
