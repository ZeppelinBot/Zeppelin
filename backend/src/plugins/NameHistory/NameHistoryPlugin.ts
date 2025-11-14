import { guildPlugin } from "vety";
import { Queue } from "../../Queue.js";
import { GuildNicknameHistory } from "../../data/GuildNicknameHistory.js";
import { UsernameHistory } from "../../data/UsernameHistory.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { NamesCmd } from "./commands/NamesCmd.js";
import { NameHistoryPluginType, zNameHistoryConfig } from "./types.js";

export const NameHistoryPlugin = guildPlugin<NameHistoryPluginType>()({
  name: "name_history",

  configSchema: zNameHistoryConfig,
  defaultOverrides: [
    {
      level: ">=50",
      config: {
        can_view: true,
      },
    },
  ],

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
