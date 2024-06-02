import { nameHistoryEvt } from "../types.js";
import { updateNickname } from "../updateNickname.js";

export const ChannelJoinEvt = nameHistoryEvt({
  event: "voiceStateUpdate",

  async listener(meta) {
    meta.pluginData.state.updateQueue.add(() =>
      updateNickname(meta.pluginData, meta.args.newState.member ?? meta.args.oldState.member!),
    );
  },
});

export const MessageCreateEvt = nameHistoryEvt({
  event: "messageCreate",

  async listener(meta) {
    meta.pluginData.state.updateQueue.add(() => updateNickname(meta.pluginData, meta.args.message.member!));
  },
});
