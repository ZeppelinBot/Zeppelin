import { usernameEvent } from "../types";
import { updateUsername } from "../updateUsername";

export const VoiceChannelJoinEvt = usernameEvent({
  event: "voiceChannelJoin",

  async listener(meta) {
    if (meta.args.member.bot) return;
    meta.pluginData.state.updateQueue.add(() => updateUsername(meta.pluginData, meta.args.member.user));
  },
});
