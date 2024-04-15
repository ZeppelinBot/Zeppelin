import { PluginOptions, guildPlugin } from "knub";
import { Queue } from "../../Queue";
import { GuildReactionRoles } from "../../data/GuildReactionRoles";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { ClearReactionRolesCmd } from "./commands/ClearReactionRolesCmd";
import { InitReactionRolesCmd } from "./commands/InitReactionRolesCmd";
import { RefreshReactionRolesCmd } from "./commands/RefreshReactionRolesCmd";
import { AddReactionRoleEvt } from "./events/AddReactionRoleEvt";
import { MessageDeletedEvt } from "./events/MessageDeletedEvt";
import { ReactionRolesPluginType, zReactionRolesConfig } from "./types";
import { CommonPlugin } from "../Common/CommonPlugin";

const MIN_AUTO_REFRESH = 1000 * 60 * 15; // 15min minimum, let's not abuse the API

const defaultOptions: PluginOptions<ReactionRolesPluginType> = {
  config: {
    auto_refresh_interval: MIN_AUTO_REFRESH,
    remove_user_reactions: true,

    can_manage: false,

    button_groups: null,
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

export const ReactionRolesPlugin = guildPlugin<ReactionRolesPluginType>()({
  name: "reaction_roles",

  dependencies: () => [LogsPlugin],
  configParser: (input) => zReactionRolesConfig.parse(input),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
    RefreshReactionRolesCmd,
    ClearReactionRolesCmd,
    InitReactionRolesCmd,
  ],

  // prettier-ignore
  events: [
    AddReactionRoleEvt,
    MessageDeletedEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.reactionRoles = GuildReactionRoles.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.reactionRemoveQueue = new Queue();
    state.roleChangeQueue = new Queue();
    state.pendingRoleChanges = new Map();
    state.pendingRefreshes = new Set();
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  afterLoad(pluginData) {
    const config = pluginData.config.get();
    if (config.button_groups) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: "The 'button_groups' option of the 'reaction_roles' plugin is deprecated and non-functional. Consider using the new 'role_buttons' plugin instead!",
      });
    }
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    if (state.autoRefreshTimeout) {
      clearTimeout(state.autoRefreshTimeout);
    }
  },
});
