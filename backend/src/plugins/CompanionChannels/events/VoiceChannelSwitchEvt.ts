import { eventListener } from "knub";
import { CompanionChannelsPluginType } from "../types";
import { handleCompanionPermissions } from "../functions/handleCompanionPermissions";

export const VoiceChannelSwitchEvt = eventListener<CompanionChannelsPluginType>()(
  "voiceChannelSwitch",
  ({ pluginData, args: { member, oldChannel, newChannel } }) => {
    handleCompanionPermissions(pluginData, member.id, newChannel.id, oldChannel.id);
  },
);
