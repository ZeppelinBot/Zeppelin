import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { AutoReactionsPluginType, ConfigSchema } from "./types";
import { PluginOptions } from "knub";
import { NewAutoReactionsCmd } from "./commands/NewAutoReactionsCmd";
import { DisableAutoReactionsCmd } from "./commands/DisableAutoReactionsCmd";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildAutoReactions } from "../../data/GuildAutoReactions";
import { AddReactionsEvt } from "./events/AddReactionsEvt";
import { trimPluginDescription } from "../../utils";
import { LogsPlugin } from "../Logs/LogsPlugin";

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
  },

  dependencies: [LogsPlugin],
  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
    NewAutoReactionsCmd,
    DisableAutoReactionsCmd,
  ],

  // prettier-ignore
  events: [
    AddReactionsEvt,
  ],

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.autoReactions = GuildAutoReactions.getGuildInstance(guild.id);
  },
});
