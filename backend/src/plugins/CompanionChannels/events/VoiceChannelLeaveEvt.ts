import { companionChannelsEvt } from "../types";
import { handleCompanionPermissions } from "../functions/handleCompanionPermissions";

export const VoiceChannelLeaveEvt = companionChannelsEvt({
  event: "voiceChannelLeave",
  listener({ pluginData, args: { member, oldChannel } }) {
    handleCompanionPermissions(pluginData, member.id, null, oldChannel);
  },
});
