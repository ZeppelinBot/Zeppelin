import moment from "moment-timezone";
import { MuteTypes } from "../../../data/MuteTypes.js";
import { noop } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin.js";
import { getTimeoutExpiryTime } from "../functions/getTimeoutExpiryTime.js";
import { mutesEvt } from "../types.js";

/**
 * Reapply active mutes on join
 */
export const ReapplyActiveMuteOnJoinEvt = mutesEvt({
  event: "guildMemberAdd",
  async listener({ pluginData, args: { member } }) {
    const mute = await pluginData.state.mutes.findExistingMuteForUserId(member.id);
    const logs = pluginData.getPlugin(LogsPlugin);
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
        if (member.moderatable) {
          await member.disableCommunicationUntil(timeoutExpiresAt).catch(noop);
        } else {
          logs.logBotAlert({
            body: `Cannot mute user, specified user is not moderatable`,
          });
        }
      }
    }

    logs.logMemberMuteRejoin({
      member,
    });
  },
});
