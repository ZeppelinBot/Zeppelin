import { PluginOptions, guildPlugin } from "knub";
import { GuildAutoReactions } from "../../data/GuildAutoReactions.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { DisableAutoReactionsCmd } from "./commands/DisableAutoReactionsCmd.js";
import { NewAutoReactionsCmd } from "./commands/NewAutoReactionsCmd.js";
import { AddReactionsEvt } from "./events/AddReactionsEvt.js";
import { AutoReactionsPluginType, zAutoReactionsConfig } from "./types.js";

const defaultOptions: PluginOptions<AutoReactionsPluginType> = {
  config: {
    can_manage: false,
  },
  overrides: [
    {
      level: ">=100",
      config: {
        can_manage: true,
      },
    },
  ],
};

export const AutoReactionsPlugin = guildPlugin<AutoReactionsPluginType>()({
  name: "auto_reactions",

  // prettier-ignore
  dependencies: () => [
    LogsPlugin,
  ],

  configParser: (input) => zAutoReactionsConfig.parse(input),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
    NewAutoReactionsCmd,
    DisableAutoReactionsCmd,
  ],

  // prettier-ignore
  events: [
    AddReactionsEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.autoReactions = GuildAutoReactions.getGuildInstance(guild.id);
    state.cache = new Map();
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },
});
