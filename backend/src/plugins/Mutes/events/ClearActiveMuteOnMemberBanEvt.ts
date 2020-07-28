import { eventListener } from "knub";
import { MutesPluginType } from "../types";

/**
 * Clear active mute from the member if the member is banned
 */
export const ClearActiveMuteOnMemberBanEvt = eventListener<MutesPluginType>()(
  "guildBanAdd",
  async ({ pluginData, args: { user } }) => {
    const mute = await pluginData.state.mutes.findExistingMuteForUserId(user.id);
    if (mute) {
      pluginData.state.mutes.clear(user.id);
    }
  },
);
