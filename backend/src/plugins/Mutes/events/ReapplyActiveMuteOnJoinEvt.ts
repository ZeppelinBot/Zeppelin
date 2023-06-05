import moment from "moment-timezone";
import { MuteTypes } from "../../../data/MuteTypes";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin";
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
      const muteRoleId = pluginData.config.get().mute_role;
      if (muteRoleId) {
        pluginData.getPlugin(RoleManagerPlugin).addPriorityRole(member.id, muteRoleId);
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
