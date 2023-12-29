import { PluginOptions } from "knub";
import { Queue } from "../../Queue";
import { GuildNicknameHistory } from "../../data/GuildNicknameHistory";
import { UsernameHistory } from "../../data/UsernameHistory";
import { makeIoTsConfigParser } from "../../pluginUtils";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { NamesCmd } from "./commands/NamesCmd";
import { ConfigSchema, NameHistoryPluginType } from "./types";

const defaultOptions: PluginOptions<NameHistoryPluginType> = {
  config: {
    can_view: false,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_view: true,
      },
    },
  ],
};

export const NameHistoryPlugin = zeppelinGuildPlugin<NameHistoryPluginType>()({
  name: "name_history",
  showInDocs: false,

  configParser: makeIoTsConfigParser(ConfigSchema),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
    NamesCmd,
  ],

  // prettier-ignore
  events: [
    // FIXME: Temporary
    // ChannelJoinEvt,
    // MessageCreateEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.nicknameHistory = GuildNicknameHistory.getGuildInstance(guild.id);
    state.usernameHistory = new UsernameHistory();
    state.updateQueue = new Queue();
  },
});
