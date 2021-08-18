import { handleCompanionPermissions } from "../functions/handleCompanionPermissions";
import { companionChannelsEvt } from "../types";

export const VoiceStateUpdateEvt = companionChannelsEvt({
  event: "voiceStateUpdate",
  listener({ pluginData, args: { oldState, newState } }) {
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    const memberId = newState.member?.id ?? oldState.member?.id;
    if (!memberId) {
      return;
    }

    handleCompanionPermissions(pluginData, memberId, newChannel, oldChannel);
  },
});
