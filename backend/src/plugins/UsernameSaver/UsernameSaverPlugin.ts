import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { UsernameHistory } from "../../data/UsernameHistory";
import { Queue } from "../../Queue";
import { UsernameSaverPluginType } from "./types";
import { MessageCreateUpdateUsernameEvt, VoiceChannelJoinUpdateUsernameEvt } from "./events/UpdateUsernameEvts";
import * as t from "io-ts";

export const UsernameSaverPlugin = zeppelinGuildPlugin<UsernameSaverPluginType>()({
  name: "username_saver",
  showInDocs: false,

  configSchema: t.type({}),

  // prettier-ignore
  events: [
    MessageCreateUpdateUsernameEvt,
    VoiceChannelJoinUpdateUsernameEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.usernameHistory = new UsernameHistory();
    state.updateQueue = new Queue();
  },
});
