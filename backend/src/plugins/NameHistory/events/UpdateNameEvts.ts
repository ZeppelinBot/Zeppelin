import { nameHistoryEvt } from "../types";
import { updateNickname } from "../updateNickname";

export const ChannelJoinEvt = nameHistoryEvt({
  event: "voiceChannelJoin",

  async listener(meta) {
    meta.pluginData.state.updateQueue.add(() => updateNickname(meta.pluginData, meta.args.member));
  },
});

export const MessageCreateEvt = nameHistoryEvt({
  event: "messageCreate",

  async listener(meta) {
    meta.pluginData.state.updateQueue.add(() => updateNickname(meta.pluginData, meta.args.message.member));
  },
});
