import { PluginOptions, guildPlugin } from "knub";
import { Queue } from "../../Queue";
import { GuildNicknameHistory } from "../../data/GuildNicknameHistory";
import { UsernameHistory } from "../../data/UsernameHistory";
import { NamesCmd } from "./commands/NamesCmd";
import { NameHistoryPluginType, zNameHistoryConfig } from "./types";
import { CommonPlugin } from "../Common/CommonPlugin";

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

export const NameHistoryPlugin = guildPlugin<NameHistoryPluginType>()({
  name: "name_history",

  configParser: (input) => zNameHistoryConfig.parse(input),
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

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },
});
