import { PluginOptions } from "knub";
import { NameHistoryPluginType, ConfigSchema } from "./types";
import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { GuildNicknameHistory } from "src/data/GuildNicknameHistory";
import { UsernameHistory } from "src/data/UsernameHistory";
import { Queue } from "src/Queue";
import { NamesCmd } from "./commands/NamesCmd";
import { ChannelJoinEvt, MessageCreateEvt } from "./events/UpdateNameEvts";

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

export const NameHistoryPlugin = zeppelinPlugin<NameHistoryPluginType>()("name_history", {
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

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.nicknameHistory = GuildNicknameHistory.getGuildInstance(guild.id);
    state.usernameHistory = new UsernameHistory();
    state.updateQueue = new Queue();
  },
});
