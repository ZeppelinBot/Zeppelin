import { PluginOptions } from "knub";
import { ConfigPreprocessorFn } from "knub/dist/config/configTypes";
import { GuildButtonRoles } from "../../data/GuildButtonRoles";
import { isValidSnowflake } from "../../utils";
import { StrictValidationError } from "../../validatorUtils";
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
import { getRowCount } from "./util/splitButtonsIntoRows";

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

const MAXIMUM_COMPONENT_ROWS = 5;

const configPreprocessor: ConfigPreprocessorFn<ReactionRolesPluginType> = options => {
  if (options.config.button_groups) {
    for (const [groupName, group] of Object.entries(options.config.button_groups)) {
      const defaultButtonNames = Object.keys(group.default_buttons);
      const defaultButtons = Object.values(group.default_buttons);
      const menuNames = Object.keys(group.button_menus ?? []);

      const defaultBtnRowCount = getRowCount(defaultButtons);
      if (defaultBtnRowCount > MAXIMUM_COMPONENT_ROWS || defaultBtnRowCount === 0) {
        throw new StrictValidationError([
          `Invalid row count for default_buttons: You currently have ${defaultBtnRowCount}, the maximum is 5. A new row is started automatically each 5 consecutive buttons.`,
        ]);
      }

      for (let i = 0; i < defaultButtons.length; i++) {
        const defBtn = defaultButtons[i];
        if (!menuNames.includes(defBtn.role_or_menu) && !isValidSnowflake(defBtn.role_or_menu)) {
          throw new StrictValidationError([
            `Invalid value for default_buttons/${defaultButtonNames[i]}/role_or_menu: ${defBtn.role_or_menu} is neither an existing menu nor a valid snowflake.`,
          ]);
        }
        if (!defBtn.label && !defBtn.emoji) {
          throw new StrictValidationError([
            `Invalid values for default_buttons/${defaultButtonNames[i]}/(label|emoji): Must have label, emoji or both set for the button to be valid.`,
          ]);
        }
      }

      for (const [menuName, menuButtonEntries] of Object.entries(group.button_menus ?? [])) {
        const menuButtonNames = Object.keys(menuButtonEntries);
        const menuButtons = Object.values(menuButtonEntries);

        const menuButtonRowCount = getRowCount(menuButtons);
        if (menuButtonRowCount > MAXIMUM_COMPONENT_ROWS || menuButtonRowCount === 0) {
          throw new StrictValidationError([
            `Invalid row count for button_menus/${menuName}: You currently have ${menuButtonRowCount}, the maximum is 5. A new row is started automatically each 5 consecutive buttons.`,
          ]);
        }

        for (let i = 0; i < menuButtons.length; i++) {
          const menuBtn = menuButtons[i];
          if (!menuNames.includes(menuBtn.role_or_menu) && !isValidSnowflake(menuBtn.role_or_menu)) {
            throw new StrictValidationError([
              `Invalid value for button_menus/${menuButtonNames[i]}/role_or_menu: ${menuBtn.role_or_menu} is neither an existing menu nor a valid snowflake.`,
            ]);
          }
          if (!menuBtn.label && !menuBtn.emoji) {
            throw new StrictValidationError([
              `Invalid values for default_buttons/${defaultButtonNames[i]}/(label|emoji): Must have label, emoji or both set for the button to be valid.`,
            ]);
          }
        }
      }
    }
  }

  return options;
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
  configPreprocessor,

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
