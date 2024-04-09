import { usernameSaverEvt } from "../types.js";
import { updateUsername } from "../updateUsername.js";

export const MessageCreateUpdateUsernameEvt = usernameSaverEvt({
  event: "messageCreate",

  async listener(meta) {
    if (meta.args.message.author.bot) return;
    meta.pluginData.state.updateQueue.add(() => updateUsername(meta.pluginData, meta.args.message.author));
  },
});

export const VoiceChannelJoinUpdateUsernameEvt = usernameSaverEvt({
  event: "voiceStateUpdate",

  async listener(meta) {
    if (meta.args.newState.member?.user.bot) return;
    meta.pluginData.state.updateQueue.add(() => updateUsername(meta.pluginData, meta.args.newState.member!.user));
  },
});
