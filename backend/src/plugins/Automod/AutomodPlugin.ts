import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { AutomodPluginType, ConfigSchema } from "./types";
import { RunAutomodOnJoinEvt } from "./events/RunAutomodOnJoinEvt";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { runAutomodOnMessage } from "./events/runAutomodOnMessage";
import { Queue } from "../../Queue";
import { configUtils, CooldownManager } from "knub";
import { availableTriggers } from "./triggers/availableTriggers";
import { StrictValidationError } from "../../validatorUtils";
import { ConfigPreprocessorFn } from "knub/dist/config/configTypes";
import { availableActions } from "./actions/availableActions";
import { clearOldRecentActions } from "./functions/clearOldRecentActions";
import { MINUTES, SECONDS } from "../../utils";
import { clearOldRecentSpam } from "./functions/clearOldRecentSpam";
import { GuildAntiraidLevels } from "../../data/GuildAntiraidLevels";
import { GuildArchives } from "../../data/GuildArchives";
import { clearOldRecentNicknameChanges } from "./functions/clearOldNicknameChanges";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { ModActionsPlugin } from "../ModActions/ModActionsPlugin";
import { MutesPlugin } from "../Mutes/MutesPlugin";
import { AntiraidClearCmd } from "./commands/AntiraidClearCmd";
import { SetAntiraidCmd } from "./commands/SetAntiraidCmd";
import { ViewAntiraidCmd } from "./commands/ViewAntiraidCmd";

const defaultOptions = {
  config: {
    rules: {},
    antiraid_levels: ["low", "medium", "high"],
    can_set_antiraid: false,
    can_view_antiraid: false,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_view_antiraid: true,
      },
    },
    {
      level: ">=100",
      config: {
        can_set_antiraid: true,
      },
    },
  ],
};

/**
 * Config preprocessor to set default values for triggers
 */
const configPreprocessor: ConfigPreprocessorFn<AutomodPluginType> = options => {
  if (options.config?.rules) {
    // Loop through each rule
    for (const [name, rule] of Object.entries(options.config.rules)) {
      if (rule == null) {
        delete options.config.rules[name];
        continue;
      }

      rule["name"] = name;

      // If the rule doesn't have an explicitly set "enabled" property, set it to true
      if (rule["enabled"] == null) {
        rule["enabled"] = true;
      }

      if (rule["affects_bots"] == null) {
        rule["affects_bots"] = false;
      }

      // Loop through the rule's triggers
      if (rule["triggers"]) {
        for (const triggerObj of rule["triggers"]) {
          for (const triggerName in triggerObj) {
            if (!availableTriggers[triggerName]) {
              throw new StrictValidationError([`Unknown trigger '${triggerName}' in rule '${rule.name}'`]);
            }

            const triggerBlueprint = availableTriggers[triggerName];
            triggerObj[triggerName] = configUtils.mergeConfig(triggerBlueprint.defaultConfig, triggerObj[triggerName]);

            if (triggerObj[triggerName].match_attachment_type) {
              const white = triggerObj[triggerName].match_attachment_type.whitelist_enabled;
              const black = triggerObj[triggerName].match_attachment_type.blacklist_enabled;

              if (white && black) {
                throw new StrictValidationError([
                  `Cannot have both blacklist and whitelist enabled at rule <${rule.name}/match_attachment_type>`,
                ]);
              } else if (!white && !black) {
                throw new StrictValidationError([
                  `Must have either blacklist or whitelist enabled at rule <${rule.name}/match_attachment_type>`,
                ]);
              }
            }
          }
        }
      }

      if (rule["actions"]) {
        for (const actionName in rule["actions"]) {
          if (!availableActions[actionName]) {
            throw new StrictValidationError([`Unknown action '${actionName}' in rule '${rule.name}'`]);
          }

          const actionBlueprint = availableActions[actionName];
          const actionConfig = rule["actions"][actionName];

          if (typeof actionConfig !== "object" || Array.isArray(actionConfig) || actionConfig == null) {
            rule["actions"][actionName] = actionConfig;
          } else {
            rule["actions"][actionName] = configUtils.mergeConfig(actionBlueprint.defaultConfig, actionConfig);
          }
        }
      }

      // Enable logging of automod actions by default
      if (rule["actions"]) {
        for (const actionName in rule.actions) {
          if (!availableActions[actionName]) {
            throw new StrictValidationError([`Unknown action '${actionName}' in rule '${rule.name}'`]);
          }
        }

        if (rule["actions"]["log"] == null) {
          rule["actions"]["log"] = true;
        }
      }
    }
  }

  return options;
};

export const AutomodPlugin = zeppelinPlugin<AutomodPluginType>()("automod", {
  dependencies: [LogsPlugin, ModActionsPlugin, MutesPlugin],

  configSchema: ConfigSchema,
  defaultOptions,
  configPreprocessor,

  customOverrideMatcher(pluginData, criteria, matchParams) {
    return criteria?.antiraid_level && criteria.antiraid_level === pluginData.state.cachedAntiraidLevel;
  },

  events: [
    RunAutomodOnJoinEvt,
    // Messages use message events from SavedMessages, see onLoad below
  ],

  commands: [AntiraidClearCmd, SetAntiraidCmd, ViewAntiraidCmd],

  async onLoad(pluginData) {
    pluginData.state.queue = new Queue();

    pluginData.state.recentActions = [];
    pluginData.state.clearRecentActionsInterval = setInterval(() => clearOldRecentActions(pluginData), 1 * MINUTES);

    pluginData.state.recentSpam = [];
    pluginData.state.clearRecentSpamInterval = setInterval(() => clearOldRecentSpam(pluginData), 1 * SECONDS);

    pluginData.state.recentNicknameChanges = new Map();
    pluginData.state.clearRecentNicknameChangesInterval = setInterval(
      () => clearOldRecentNicknameChanges(pluginData),
      30 * SECONDS,
    );

    pluginData.state.cooldownManager = new CooldownManager();

    pluginData.state.logs = new GuildLogs(pluginData.guild.id);
    pluginData.state.savedMessages = GuildSavedMessages.getGuildInstance(pluginData.guild.id);
    pluginData.state.antiraidLevels = GuildAntiraidLevels.getGuildInstance(pluginData.guild.id);
    pluginData.state.archives = GuildArchives.getGuildInstance(pluginData.guild.id);

    pluginData.state.onMessageCreateFn = message => runAutomodOnMessage(pluginData, message, false);
    pluginData.state.savedMessages.events.on("create", pluginData.state.onMessageCreateFn);

    pluginData.state.onMessageUpdateFn = message => runAutomodOnMessage(pluginData, message, true);
    pluginData.state.savedMessages.events.on("update", pluginData.state.onMessageUpdateFn);

    pluginData.state.cachedAntiraidLevel = await pluginData.state.antiraidLevels.get();
  },

  onUnload(pluginData) {
    pluginData.state.queue.clear();

    clearInterval(pluginData.state.clearRecentActionsInterval);

    clearInterval(pluginData.state.clearRecentSpamInterval);

    clearInterval(pluginData.state.clearRecentNicknameChangesInterval);

    pluginData.state.savedMessages.events.off("create", pluginData.state.onMessageCreateFn);
    pluginData.state.savedMessages.events.off("update", pluginData.state.onMessageUpdateFn);
  },
});
