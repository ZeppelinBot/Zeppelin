import { guildPlugin } from "knub";
import { Queue } from "../../Queue";
import { UsernameHistory } from "../../data/UsernameHistory";
import { MessageCreateUpdateUsernameEvt, VoiceChannelJoinUpdateUsernameEvt } from "./events/UpdateUsernameEvts";
import { UsernameSaverPluginType, zUsernameSaverConfig } from "./types";

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
