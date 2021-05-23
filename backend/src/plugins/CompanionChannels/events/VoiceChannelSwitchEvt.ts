import { companionChannelsEvt } from "../types";
import { handleCompanionPermissions } from "../functions/handleCompanionPermissions";

export const VoiceChannelSwitchEvt = companionChannelsEvt({
  event: "voiceChannelSwitch",
  listener({ pluginData, args: { member, oldChannel, newChannel } }) {
    handleCompanionPermissions(pluginData, member.id, newChannel, oldChannel);
  },
});
