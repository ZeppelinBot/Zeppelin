import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { AutoReactionsPluginType, ConfigSchema } from "./types";
import { PluginOptions } from "knub";
import { NewAutoReactionsCmd } from "./commands/NewAutoReactionsCmd";
import { DisableAutoReactionsCmd } from "./commands/DisableAutoReactionsCmd";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildAutoReactions } from "src/data/GuildAutoReactions";
import { AddReactionsEvt } from "./events/AddReactionsEvt";

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

export const AutoReactionsPlugin = zeppelinPlugin<AutoReactionsPluginType>()("auto_reactions", {
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

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.autoReactions = GuildAutoReactions.getGuildInstance(guild.id);
  },
});
