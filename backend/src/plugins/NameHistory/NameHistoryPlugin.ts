import { PluginOptions, guildPlugin } from "knub";
import { Queue } from "../../Queue.js";
import { GuildNicknameHistory } from "../../data/GuildNicknameHistory.js";
import { UsernameHistory } from "../../data/UsernameHistory.js";
import { NamesCmd } from "./commands/NamesCmd.js";
import { NameHistoryPluginType, zNameHistoryConfig } from "./types.js";

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
});
