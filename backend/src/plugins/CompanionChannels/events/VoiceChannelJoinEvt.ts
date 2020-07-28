import { eventListener } from "knub";
import { CompanionChannelsPluginType } from "../types";
import { handleCompanionPermissions } from "../functions/handleCompanionPermissions";

export const VoiceChannelJoinEvt = eventListener<CompanionChannelsPluginType>()(
  "voiceChannelJoin",
  ({ pluginData, args: { member, newChannel } }) => {
    handleCompanionPermissions(pluginData, member.id, newChannel.id);
  },
);
