import * as t from "io-ts";
import { UsernameHistory } from "../../data/UsernameHistory";
import { makeIoTsConfigParser } from "../../pluginUtils";
import { Queue } from "../../Queue";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { MessageCreateUpdateUsernameEvt, VoiceChannelJoinUpdateUsernameEvt } from "./events/UpdateUsernameEvts";
import { UsernameSaverPluginType } from "./types";

export const UsernameSaverPlugin = zeppelinGuildPlugin<UsernameSaverPluginType>()({
  name: "username_saver",
  showInDocs: false,

  configParser: makeIoTsConfigParser(t.type({})),

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
