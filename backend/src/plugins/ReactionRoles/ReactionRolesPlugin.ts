import { PluginOptions } from "knub";
import { GuildButtonRoles } from "src/data/GuildButtonRoles";
import { GuildReactionRoles } from "../../data/GuildReactionRoles";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { Queue } from "../../Queue";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ClearReactionRolesCmd } from "./commands/ClearReactionRolesCmd";
import { InitReactionRolesCmd } from "./commands/InitReactionRolesCmd";
import { PostButtonRolesCmd } from "./commands/PostButtonRolesCmd";
import { RefreshReactionRolesCmd } from "./commands/RefreshReactionRolesCmd";
import { AddReactionRoleEvt } from "./events/AddReactionRoleEvt";
import { ButtonInteractionEvt } from "./events/ButtonInteractionEvt";
import { MessageDeletedEvt } from "./events/MessageDeletedEvt";
import { ConfigSchema, ReactionRolesPluginType } from "./types";
import { autoRefreshLoop } from "./util/autoRefreshLoop";

const MIN_AUTO_REFRESH = 1000 * 60 * 15; // 15min minimum, let's not abuse the API

const defaultOptions: PluginOptions<ReactionRolesPluginType> = {
  config: {
    button_groups: {},
    auto_refresh_interval: MIN_AUTO_REFRESH,
    remove_user_reactions: true,

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

export const ReactionRolesPlugin = zeppelinGuildPlugin<ReactionRolesPluginType>()({
  name: "reaction_roles",
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
    PostButtonRolesCmd,
  ],

  // prettier-ignore
  events: [
    AddReactionRoleEvt,
    ButtonInteractionEvt,
    MessageDeletedEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.reactionRoles = GuildReactionRoles.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.buttonRoles = GuildButtonRoles.getGuildInstance(guild.id);
    state.reactionRemoveQueue = new Queue();
    state.roleChangeQueue = new Queue();
    state.pendingRoleChanges = new Map();
    state.pendingRefreshes = new Set();
  },

  afterLoad(pluginData) {
    let autoRefreshInterval = pluginData.config.get().auto_refresh_interval;
    if (autoRefreshInterval != null) {
      autoRefreshInterval = Math.max(MIN_AUTO_REFRESH, autoRefreshInterval);
      autoRefreshLoop(pluginData, autoRefreshInterval);
    }
  },

  beforeUnload(pluginData) {
    if (pluginData.state.autoRefreshTimeout) {
      clearTimeout(pluginData.state.autoRefreshTimeout);
    }
  },
});
