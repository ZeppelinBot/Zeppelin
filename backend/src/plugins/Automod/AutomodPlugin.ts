import { configUtils, CooldownManager } from "knub";
import { ConfigPreprocessorFn } from "knub/dist/config/configTypes";
import { GuildAntiraidLevels } from "../../data/GuildAntiraidLevels";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { Queue } from "../../Queue";
import { discardRegExpRunner, getRegExpRunner } from "../../regExpRunners";
import { MINUTES, SECONDS } from "../../utils";
import { registerEventListenersFromMap } from "../../utils/registerEventListenersFromMap";
import { unregisterEventListenersFromMap } from "../../utils/unregisterEventListenersFromMap";
import { StrictValidationError } from "../../validatorUtils";
import { CountersPlugin } from "../Counters/CountersPlugin";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { ModActionsPlugin } from "../ModActions/ModActionsPlugin";
import { MutesPlugin } from "../Mutes/MutesPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { availableActions } from "./actions/availableActions";
import { AntiraidClearCmd } from "./commands/AntiraidClearCmd";
import { SetAntiraidCmd } from "./commands/SetAntiraidCmd";
import { ViewAntiraidCmd } from "./commands/ViewAntiraidCmd";
import { runAutomodOnCounterTrigger } from "./events/runAutomodOnCounterTrigger";
import { RunAutomodOnJoinEvt, RunAutomodOnLeaveEvt } from "./events/RunAutomodOnJoinLeaveEvt";
import { RunAutomodOnMemberUpdate } from "./events/RunAutomodOnMemberUpdate";
import { runAutomodOnMessage } from "./events/runAutomodOnMessage";
import { runAutomodOnModAction } from "./events/runAutomodOnModAction";
import { clearOldRecentNicknameChanges } from "./functions/clearOldNicknameChanges";
import { clearOldRecentActions } from "./functions/clearOldRecentActions";
import { clearOldRecentSpam } from "./functions/clearOldRecentSpam";
import { pluginInfo } from "./info";
import { availableTriggers } from "./triggers/availableTriggers";
import { AutomodPluginType, ConfigSchema } from "./types";

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
 * Config preprocessor to set default values for triggers and perform extra validation
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

            if (typeof triggerBlueprint.defaultConfig === "object" && triggerBlueprint.defaultConfig != null) {
              triggerObj[triggerName] = configUtils.mergeConfig(
                triggerBlueprint.defaultConfig,
                triggerObj[triggerName] || {},
              );
            } else {
              triggerObj[triggerName] = triggerObj[triggerName] || triggerBlueprint.defaultConfig;
            }

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

export const AutomodPlugin = zeppelinGuildPlugin<AutomodPluginType>()({
  name: "automod",
  showInDocs: true,
  info: pluginInfo,

  // prettier-ignore
  dependencies: [
    LogsPlugin,
    ModActionsPlugin,
    MutesPlugin,
    CountersPlugin,
  ],

  configSchema: ConfigSchema,
  defaultOptions,
  configPreprocessor,

  customOverrideCriteriaFunctions: {
    antiraid_level: (pluginData, matchParams, value) => {
      return value ? value === pluginData.state.cachedAntiraidLevel : false;
    },
  },

  // prettier-ignore
  events: [
    RunAutomodOnJoinEvt,
    RunAutomodOnMemberUpdate,
    RunAutomodOnLeaveEvt,
    // Messages use message events from SavedMessages, see onLoad below
  ],

  commands: [AntiraidClearCmd, SetAntiraidCmd, ViewAntiraidCmd],

  async beforeLoad(pluginData) {
    pluginData.state.queue = new Queue();

    pluginData.state.regexRunner = getRegExpRunner(`guild-${pluginData.guild.id}`);

    pluginData.state.recentActions = [];

    pluginData.state.recentSpam = [];

    pluginData.state.recentNicknameChanges = new Map();

    pluginData.state.ignoredRoleChanges = new Set();

    pluginData.state.cooldownManager = new CooldownManager();

    pluginData.state.logs = new GuildLogs(pluginData.guild.id);
    pluginData.state.savedMessages = GuildSavedMessages.getGuildInstance(pluginData.guild.id);
    pluginData.state.antiraidLevels = GuildAntiraidLevels.getGuildInstance(pluginData.guild.id);
    pluginData.state.archives = GuildArchives.getGuildInstance(pluginData.guild.id);

    pluginData.state.cachedAntiraidLevel = await pluginData.state.antiraidLevels.get();
  },

  async afterLoad(pluginData) {
    pluginData.state.clearRecentActionsInterval = setInterval(() => clearOldRecentActions(pluginData), 1 * MINUTES);
    pluginData.state.clearRecentSpamInterval = setInterval(() => clearOldRecentSpam(pluginData), 1 * SECONDS);
    pluginData.state.clearRecentNicknameChangesInterval = setInterval(
      () => clearOldRecentNicknameChanges(pluginData),
      30 * SECONDS,
    );

    pluginData.state.onMessageCreateFn = message => runAutomodOnMessage(pluginData, message, false);
    pluginData.state.savedMessages.events.on("create", pluginData.state.onMessageCreateFn);

    pluginData.state.onMessageUpdateFn = message => runAutomodOnMessage(pluginData, message, true);
    pluginData.state.savedMessages.events.on("update", pluginData.state.onMessageUpdateFn);

    const countersPlugin = pluginData.getPlugin(CountersPlugin);

    pluginData.state.onCounterTrigger = (name, triggerName, channelId, userId) => {
      runAutomodOnCounterTrigger(pluginData, name, triggerName, channelId, userId, false);
    };

    pluginData.state.onCounterReverseTrigger = (name, triggerName, channelId, userId) => {
      runAutomodOnCounterTrigger(pluginData, name, triggerName, channelId, userId, true);
    };

    countersPlugin.onCounterEvent("trigger", pluginData.state.onCounterTrigger);
    countersPlugin.onCounterEvent("reverseTrigger", pluginData.state.onCounterReverseTrigger);

    const modActionsEvents = pluginData.getPlugin(ModActionsPlugin).getEventEmitter();
    pluginData.state.modActionsListeners = new Map();
    pluginData.state.modActionsListeners.set("note", (userId: string) =>
      runAutomodOnModAction(pluginData, "note", userId),
    );
    pluginData.state.modActionsListeners.set(
      "warn",
      (userId: string, reason: string | undefined, isAutomodAction: boolean) =>
        runAutomodOnModAction(pluginData, "warn", userId, reason, isAutomodAction),
    );
    pluginData.state.modActionsListeners.set(
      "kick",
      (userId: string, reason: string | undefined, isAutomodAction: boolean) =>
        runAutomodOnModAction(pluginData, "kick", userId, reason, isAutomodAction),
    );
    pluginData.state.modActionsListeners.set(
      "ban",
      (userId: string, reason: string | undefined, isAutomodAction: boolean) =>
        runAutomodOnModAction(pluginData, "ban", userId, reason, isAutomodAction),
    );
    pluginData.state.modActionsListeners.set("unban", (userId: string) =>
      runAutomodOnModAction(pluginData, "unban", userId),
    );
    registerEventListenersFromMap(modActionsEvents, pluginData.state.modActionsListeners);

    const mutesEvents = pluginData.getPlugin(MutesPlugin).getEventEmitter();
    pluginData.state.mutesListeners = new Map();
    pluginData.state.mutesListeners.set(
      "mute",
      (userId: string, reason: string | undefined, isAutomodAction: boolean) =>
        runAutomodOnModAction(pluginData, "mute", userId, reason, isAutomodAction),
    );
    pluginData.state.mutesListeners.set("unmute", (userId: string) =>
      runAutomodOnModAction(pluginData, "unmute", userId),
    );
    registerEventListenersFromMap(mutesEvents, pluginData.state.mutesListeners);
  },

  async beforeUnload(pluginData) {
    const countersPlugin = pluginData.getPlugin(CountersPlugin);
    countersPlugin.offCounterEvent("trigger", pluginData.state.onCounterTrigger);
    countersPlugin.offCounterEvent("reverseTrigger", pluginData.state.onCounterReverseTrigger);

    const modActionsEvents = pluginData.getPlugin(ModActionsPlugin).getEventEmitter();
    unregisterEventListenersFromMap(modActionsEvents, pluginData.state.modActionsListeners);

    const mutesEvents = pluginData.getPlugin(MutesPlugin).getEventEmitter();
    unregisterEventListenersFromMap(mutesEvents, pluginData.state.mutesListeners);

    pluginData.state.queue.clear();

    discardRegExpRunner(`guild-${pluginData.guild.id}`);

    clearInterval(pluginData.state.clearRecentActionsInterval);

    clearInterval(pluginData.state.clearRecentSpamInterval);

    clearInterval(pluginData.state.clearRecentNicknameChangesInterval);

    pluginData.state.savedMessages.events.off("create", pluginData.state.onMessageCreateFn);
    pluginData.state.savedMessages.events.off("update", pluginData.state.onMessageUpdateFn);
  },
});
