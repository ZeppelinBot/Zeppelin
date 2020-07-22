import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { UsernameHistory } from "src/data/UsernameHistory";
import { Queue } from "src/Queue";
import { UsernameSaverPluginType } from "./types";
import { MessageCreateUpdateUsernameEvt, VoiceChannelJoinUpdateUsernameEvt } from "./events/UpdateUsernameEvts";

export const UsernameSaverPlugin = zeppelinPlugin<UsernameSaverPluginType>()("username_saver", {
  // prettier-ignore
  events: [
    MessageCreateUpdateUsernameEvt,
    VoiceChannelJoinUpdateUsernameEvt,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.usernameHistory = new UsernameHistory();
    state.updateQueue = new Queue();
  },
});
