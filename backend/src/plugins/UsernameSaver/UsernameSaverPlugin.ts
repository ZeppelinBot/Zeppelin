import * as t from "io-ts";
import { UsernameHistory } from "../../data/UsernameHistory";
import { Queue } from "../../Queue";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { MessageCreateUpdateUsernameEvt, VoiceChannelJoinUpdateUsernameEvt } from "./events/UpdateUsernameEvts";
import { UsernameSaverPluginType } from "./types";

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
