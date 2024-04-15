import { PluginOptions, guildPlugin } from "knub";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildStarboardMessages } from "../../data/GuildStarboardMessages";
import { GuildStarboardReactions } from "../../data/GuildStarboardReactions";
import { MigratePinsCmd } from "./commands/MigratePinsCmd";
import { StarboardReactionAddEvt } from "./events/StarboardReactionAddEvt";
import { StarboardReactionRemoveAllEvt, StarboardReactionRemoveEvt } from "./events/StarboardReactionRemoveEvts";
import { StarboardPluginType, zStarboardConfig } from "./types";
import { onMessageDelete } from "./util/onMessageDelete";
import { CommonPlugin } from "../Common/CommonPlugin";

const defaultOptions: PluginOptions<StarboardPluginType> = {
  config: {
    can_migrate: false,
    boards: {},
  },

  overrides: [
    {
      level: ">=100",
      config: {
        can_migrate: true,
      },
    },
  ],
};

export const StarboardPlugin = guildPlugin<StarboardPluginType>()({
  name: "starboard",

  configParser: (input) => zStarboardConfig.parse(input),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
    MigratePinsCmd,
  ],

  // prettier-ignore
  events: [
    StarboardReactionAddEvt,
    StarboardReactionRemoveEvt,
    StarboardReactionRemoveAllEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.starboardMessages = GuildStarboardMessages.getGuildInstance(guild.id);
    state.starboardReactions = GuildStarboardReactions.getGuildInstance(guild.id);
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  afterLoad(pluginData) {
    const { state } = pluginData;

    state.onMessageDeleteFn = (msg) => onMessageDelete(pluginData, msg);
    state.savedMessages.events.on("delete", state.onMessageDeleteFn);
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    state.savedMessages.events.off("delete", state.onMessageDeleteFn);
  },
});
