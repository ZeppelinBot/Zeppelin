import { usernameEvent } from "../types";
import { updateUsername } from "../updateUsername";

export const MessageCreateUpdateUsernameEvt = usernameEvent({
  event: "messageCreate",

  async listener(meta) {
    if (meta.args.message.author.bot) return;
    meta.pluginData.state.updateQueue.add(() => updateUsername(meta.pluginData, meta.args.message.author));
  },
});

export const VoiceChannelJoinUpdateUsernameEvt = usernameEvent({
  event: "voiceChannelJoin",

  async listener(meta) {
    if (meta.args.member.bot) return;
    meta.pluginData.state.updateQueue.add(() => updateUsername(meta.pluginData, meta.args.member.user));
  },
});
