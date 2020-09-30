import { companionChannelsEvt } from "../types";
import { handleCompanionPermissions } from "../functions/handleCompanionPermissions";

export const VoiceChannelLeaveEvt = companionChannelsEvt(
  "voiceChannelLeave",
  ({ pluginData, args: { member, oldChannel } }) => {
    handleCompanionPermissions(pluginData, member.id, null, oldChannel);
  },
);
