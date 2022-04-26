import { PluginOptions } from "knub";
import { GuildReactionRoles } from "../../data/GuildReactionRoles";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { Queue } from "../../Queue";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ClearReactionRolesCmd } from "./commands/ClearReactionRolesCmd";
import { InitReactionRolesCmd } from "./commands/InitReactionRolesCmd";
import { RefreshReactionRolesCmd } from "./commands/RefreshReactionRolesCmd";
import { AddReactionRoleEvt } from "./events/AddReactionRoleEvt";
import { MessageDeletedEvt } from "./events/MessageDeletedEvt";
import { ConfigSchema, ReactionRolesPluginType } from "./types";

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

export const ReactionRolesPlugin = zeppelinGuildPlugin<ReactionRolesPluginType>()({
  name: "reaction_roles",
  showInDocs: true,
  info: {
    prettyName: "Reaction roles",
    legacy: "Consider using the [Role buttons](/docs/plugins/role_buttons) plugin instead.",
  },

  dependencies: () => [LogsPlugin],
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

  afterLoad(pluginData) {
    const config = pluginData.config.get();
    if (config.button_groups) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: "The 'button_groups' option of the 'reaction_roles' plugin is deprecated and non-functional. Consider using the new 'role_buttons' plugin instead!",
      });
    }
  },

  beforeUnload(pluginData) {
    if (pluginData.state.autoRefreshTimeout) {
      clearTimeout(pluginData.state.autoRefreshTimeout);
    }
  },
});
