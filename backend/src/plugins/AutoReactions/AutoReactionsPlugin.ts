import { PluginOptions } from "knub";
import { GuildAutoReactions } from "../../data/GuildAutoReactions";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { trimPluginDescription } from "../../utils";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { DisableAutoReactionsCmd } from "./commands/DisableAutoReactionsCmd";
import { NewAutoReactionsCmd } from "./commands/NewAutoReactionsCmd";
import { AddReactionsEvt } from "./events/AddReactionsEvt";
import { AutoReactionsPluginType, zAutoReactionsConfig } from "./types";

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

export const AutoReactionsPlugin = zeppelinGuildPlugin<AutoReactionsPluginType>()({
  name: "auto_reactions",
  showInDocs: true,
  info: {
    prettyName: "Auto-reactions",
    description: trimPluginDescription(`
      Allows setting up automatic reactions to all new messages on a channel
    `),
    configSchema: zAutoReactionsConfig,
  },

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
});
