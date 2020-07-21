import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { UsernameHistory } from "src/data/UsernameHistory";
import { Queue } from "src/Queue";
import { UsernameSaverPluginType } from "./types";
import { MessageCreateEvt } from "./events/MessageCreateEvt";
import { VoiceChannelJoinEvt } from "./events/VoiceChannelJoinEvt";

export const UsernameSaverPlugin = zeppelinPlugin<UsernameSaverPluginType>()("username_saver", {
  // prettier-ignore
  events: [
    MessageCreateEvt,
    VoiceChannelJoinEvt,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.usernameHistory = new UsernameHistory();
    state.updateQueue = new Queue();
  },
});
