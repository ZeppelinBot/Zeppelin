import { guildPlugin } from "knub";
import { Queue } from "../../Queue.js";
import { UsernameHistory } from "../../data/UsernameHistory.js";
import { MessageCreateUpdateUsernameEvt, VoiceChannelJoinUpdateUsernameEvt } from "./events/UpdateUsernameEvts.js";
import { UsernameSaverPluginType, zUsernameSaverConfig } from "./types.js";

export const UsernameSaverPlugin = guildPlugin<UsernameSaverPluginType>()({
  name: "username_saver",

  configParser: (input) => zUsernameSaverConfig.parse(input),

  // prettier-ignore
  events: [
    MessageCreateUpdateUsernameEvt,
    VoiceChannelJoinUpdateUsernameEvt,
  ],

  beforeLoad(pluginData) {
    const { state } = pluginData;

    state.usernameHistory = new UsernameHistory();
    state.updateQueue = new Queue();
  },
});
