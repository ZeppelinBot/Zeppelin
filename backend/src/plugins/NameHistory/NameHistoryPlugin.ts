import { PluginOptions } from "knub";
import { GuildNicknameHistory } from "../../data/GuildNicknameHistory";
import { UsernameHistory } from "../../data/UsernameHistory";
import { Queue } from "../../Queue";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { NamesCmd } from "./commands/NamesCmd";
import { ChannelJoinEvt, MessageCreateEvt } from "./events/UpdateNameEvts";
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

  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
    NamesCmd,
  ],

  // prettier-ignore
  events: [
    ChannelJoinEvt,
    MessageCreateEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.nicknameHistory = GuildNicknameHistory.getGuildInstance(guild.id);
    state.usernameHistory = new UsernameHistory();
    state.updateQueue = new Queue();
  },
});
