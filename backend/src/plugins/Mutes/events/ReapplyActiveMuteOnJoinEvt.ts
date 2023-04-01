import { Snowflake } from "discord.js";
import moment from "moment-timezone";
import { MuteTypes } from "../../../data/MuteTypes";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { getTimeoutExpiryTime } from "../functions/getTimeoutExpiryTime";
import { mutesEvt } from "../types";

/**
 * Reapply active mutes on join
 */
export const ReapplyActiveMuteOnJoinEvt = mutesEvt({
  event: "guildMemberAdd",
  async listener({ pluginData, args: { member } }) {
    const mute = await pluginData.state.mutes.findExistingMuteForUserId(member.id);
    if (!mute) {
      return;
    }

    if (mute.type === MuteTypes.Role) {
      const muteRole = pluginData.config.get().mute_role;

      if (muteRole) {
        const memberRoleLock = await pluginData.locks.acquire(memberRolesLock(member));
        try {
          await member.roles.add(muteRole as Snowflake);
        } finally {
          memberRoleLock.unlock();
        }
      }
    } else {
      if (!member.isCommunicationDisabled()) {
        const expiresAt = mute.expires_at ? moment.utc(mute.expires_at).valueOf() : null;
        const timeoutExpiresAt = getTimeoutExpiryTime(expiresAt);
        await member.disableCommunicationUntil(timeoutExpiresAt);
      }
    }

    pluginData.getPlugin(LogsPlugin).logMemberMuteRejoin({
      member,
    });
  },
});
