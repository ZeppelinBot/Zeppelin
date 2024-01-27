import { Queue } from "../../Queue";
import { UsernameHistory } from "../../data/UsernameHistory";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { MessageCreateUpdateUsernameEvt, VoiceChannelJoinUpdateUsernameEvt } from "./events/UpdateUsernameEvts";
import { UsernameSaverPluginType, zUsernameSaverConfig } from "./types";

export const UsernameSaverPlugin = zeppelinGuildPlugin<UsernameSaverPluginType>()({
  name: "username_saver",
  showInDocs: false,

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
