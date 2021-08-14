import { memberHasMutedRole } from "../functions/memberHasMutedRole";
import { mutesEvt } from "../types";

/**
 * Clear active mute if the mute role is removed manually
 */
export const ClearActiveMuteOnRoleRemovalEvt = mutesEvt({
  event: "guildMemberUpdate",
  async listener({ pluginData, args: { oldMember, newMember: member } }) {
    const muteRole = pluginData.config.get().mute_role;
    if (!muteRole) return;

    const mute = await pluginData.state.mutes.findExistingMuteForUserId(member.id);
    if (!mute) return;

    if (!memberHasMutedRole(pluginData, member)) {
      await pluginData.state.mutes.clear(muteRole);
    }
  },
});
