import { companionChannelsEvt } from "../types";
import { handleCompanionPermissions } from "../functions/handleCompanionPermissions";
import { stripObjectToScalars } from "../../../utils";

export const VoiceChannelJoinEvt = companionChannelsEvt(
  "voiceChannelJoin",
  ({ pluginData, args: { member, newChannel } }) => {
    handleCompanionPermissions(pluginData, member.id, newChannel);
  },
);
