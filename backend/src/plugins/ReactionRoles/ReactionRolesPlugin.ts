import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { PluginOptions } from "knub";
import { ConfigSchema, ReactionRolesPluginType } from "./types";
import { GuildReactionRoles } from "../../data/GuildReactionRoles";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { Queue } from "../../Queue";
import { autoRefreshLoop } from "./util/autoRefreshLoop";
import { InitReactionRolesCmd } from "./commands/InitReactionRolesCmd";
import { RefreshReactionRolesCmd } from "./commands/RefreshReactionRolesCmd";
import { ClearReactionRolesCmd } from "./commands/ClearReactionRolesCmd";
import { AddReactionRoleEvt } from "./events/AddReactionRoleEvt";
import { LogsPlugin } from "../Logs/LogsPlugin";

const MIN_AUTO_REFRESH = 1000 * 60 * 15; // 15min minimum, let's not abuse the API

const defaultOptions: PluginOptions<ReactionRolesPluginType> = {
  config: {
    auto_refresh_interval: MIN_AUTO_REFRESH,
    remove_user_reactions: true,
    dm_on_change: true,
    change_message: "Your roles have been modified on {guildName}:\nRemoved: {removedRoles}\nAdded: {addedRoles}",

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

export const ReactionRolesPlugin = zeppelinGuildPlugin<ReactionRolesPluginType>()("reaction_roles", {
  showInDocs: true,
  info: {
    prettyName: "Reaction roles",
  },

  dependencies: [LogsPlugin],
  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
    RefreshReactionRolesCmd,
    ClearReactionRolesCmd,
    InitReactionRolesCmd,
  ],

  // prettier-ignore
  events: [
    AddReactionRoleEvt,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.reactionRoles = GuildReactionRoles.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.reactionRemoveQueue = new Queue();
    state.roleChangeQueue = new Queue();
    state.pendingRoleChanges = new Map();
    state.pendingRefreshes = new Set();

    let autoRefreshInterval = pluginData.config.get().auto_refresh_interval;
    if (autoRefreshInterval != null) {
      autoRefreshInterval = Math.max(MIN_AUTO_REFRESH, autoRefreshInterval);
      autoRefreshLoop(pluginData, autoRefreshInterval);
    }
  },

  onUnload(pluginData) {
    if (pluginData.state.autoRefreshTimeout) {
      clearTimeout(pluginData.state.autoRefreshTimeout);
    }
  },
});
