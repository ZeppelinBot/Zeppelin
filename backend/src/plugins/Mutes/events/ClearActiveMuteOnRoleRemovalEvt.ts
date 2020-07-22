import { eventListener } from "knub";
import { MutesPluginType } from "../types";
import { memberHasMutedRole } from "../functions/memberHasMutedRole";

/**
 * Clear active mute if the mute role is removed manually
 */
export const ClearActiveMuteOnRoleRemovalEvt = eventListener<MutesPluginType>()(
  "guildMemberUpdate",
  async ({ pluginData, args: { member } }) => {
    const muteRole = pluginData.config.get().mute_role;
    if (!muteRole) return;

    const mute = await pluginData.state.mutes.findExistingMuteForUserId(member.id);
    if (!mute) return;

    if (!memberHasMutedRole(pluginData, member)) {
      await pluginData.state.mutes.clear(muteRole);
    }
  },
);
