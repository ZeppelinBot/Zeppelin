import { eventListener } from "knub";
import { CompanionChannelsPluginType } from "../types";
import { handleCompanionPermissions } from "../functions/handleCompanionPermissions";

export const VoiceChannelLeaveEvt = eventListener<CompanionChannelsPluginType>()(
  "voiceChannelLeave",
  ({ pluginData, args: { member, oldChannel } }) => {
    handleCompanionPermissions(pluginData, member.id, null, oldChannel.id);
  },
);
