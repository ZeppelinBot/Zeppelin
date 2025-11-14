import { guildPlugin } from "vety";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { GuildStarboardMessages } from "../../data/GuildStarboardMessages.js";
import { GuildStarboardReactions } from "../../data/GuildStarboardReactions.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { MigratePinsCmd } from "./commands/MigratePinsCmd.js";
import { StarboardReactionAddEvt } from "./events/StarboardReactionAddEvt.js";
import { StarboardReactionRemoveAllEvt, StarboardReactionRemoveEvt } from "./events/StarboardReactionRemoveEvts.js";
import { StarboardPluginType, zStarboardConfig } from "./types.js";
import { onMessageDelete } from "./util/onMessageDelete.js";

export const StarboardPlugin = guildPlugin<StarboardPluginType>()({
  name: "starboard",

  configSchema: zStarboardConfig,
  defaultOverrides: [
    {
      level: ">=100",
      config: {
        can_migrate: true,
      },
    },
  ],

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
