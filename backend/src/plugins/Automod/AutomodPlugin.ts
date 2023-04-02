import { configUtils, CooldownManager } from "knub";
import { GuildAntiraidLevels } from "../../data/GuildAntiraidLevels";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { Queue } from "../../Queue";
import { discardRegExpRunner, getRegExpRunner } from "../../regExpRunners";
import { MINUTES, SECONDS } from "../../utils";
import { registerEventListenersFromMap } from "../../utils/registerEventListenersFromMap";
import { unregisterEventListenersFromMap } from "../../utils/unregisterEventListenersFromMap";
import { parseIoTsSchema, StrictValidationError } from "../../validatorUtils";
import { CountersPlugin } from "../Counters/CountersPlugin";
import { InternalPosterPlugin } from "../InternalPoster/InternalPosterPlugin";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { ModActionsPlugin } from "../ModActions/ModActionsPlugin";
import { MutesPlugin } from "../Mutes/MutesPlugin";
import { PhishermanPlugin } from "../Phisherman/PhishermanPlugin";
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
import {
  RunAutomodOnThreadCreate,
  RunAutomodOnThreadDelete,
  RunAutomodOnThreadUpdate,
} from "./events/runAutomodOnThreadEvents";
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
 * TODO: Separate input and output types
 */
const configParser = (input: unknown) => {
  const rules = (input as any).rules;
  if (rules) {
    // Loop through each rule
    for (const [name, rule] of Object.entries(rules)) {
      if (rule == null) {
        delete rules[name];
        continue;
      }

      rule["name"] = name;

      // If the rule doesn't have an explicitly set "enabled" property, set it to true
      if (rule["enabled"] == null) {
        rule["enabled"] = true;
      }

      if (rule["allow_further_rules"] == null) {
        rule["allow_further_rules"] = false;
      }

      if (rule["affects_bots"] == null) {
        rule["affects_bots"] = false;
      }

      if (rule["affects_self"] == null) {
        rule["affects_self"] = false;
      }

      // Loop through the rule's triggers
      if (rule["triggers"]) {
        for (const triggerObj of rule["triggers"]) {
          for (const triggerName in triggerObj) {
            if (!availableTriggers[triggerName]) {
              throw new StrictValidationError([`Unknown trigger '${triggerName}' in rule '${rule["name"]}'`]);
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
                  `Cannot have both blacklist and whitelist enabled at rule <${rule["name"]}/match_attachment_type>`,
                ]);
              } else if (!white && !black) {
                throw new StrictValidationError([
                  `Must have either blacklist or whitelist enabled at rule <${rule["name"]}/match_attachment_type>`,
                ]);
              }
            }

            if (triggerObj[triggerName].match_mime_type) {
              const white = triggerObj[triggerName].match_mime_type.whitelist_enabled;
              const black = triggerObj[triggerName].match_mime_type.blacklist_enabled;

              if (white && black) {
                throw new StrictValidationError([
                  `Cannot have both blacklist and whitelist enabled at rule <${rule["name"]}/match_mime_type>`,
                ]);
              } else if (!white && !black) {
                throw new StrictValidationError([
                  `Must have either blacklist or whitelist enabled at rule <${rule["name"]}/match_mime_type>`,
                ]);
              }
            }
          }
        }
      }

      if (rule["actions"]) {
        for (const actionName in rule["actions"]) {
          if (!availableActions[actionName]) {
            throw new StrictValidationError([`Unknown action '${actionName}' in rule '${rule["name"]}'`]);
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
        for (const actionName in rule["actions"]) {
          if (!availableActions[actionName]) {
            throw new StrictValidationError([`Unknown action '${actionName}' in rule '${rule["name"]}'`]);
          }
        }

        if (rule["actions"]["log"] == null) {
          rule["actions"]["log"] = true;
        }
        if (rule["actions"]["clean"] && rule["actions"]["start_thread"]) {
          throw new StrictValidationError([`Cannot have both clean and start_thread at rule '${rule["name"]}'`]);
        }
      }
    }
  }

  return parseIoTsSchema(ConfigSchema, input);
};

export const AutomodPlugin = zeppelinGuildPlugin<AutomodPluginType>()({
  name: "automod",
  showInDocs: true,
  info: pluginInfo,

  // prettier-ignore
  dependencies: () => [
    LogsPlugin,
    ModActionsPlugin,
    MutesPlugin,
    CountersPlugin,
    PhishermanPlugin,
    InternalPosterPlugin,
  ],

  defaultOptions,
  configParser,

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
    RunAutomodOnThreadCreate,
    RunAutomodOnThreadDelete,
    RunAutomodOnThreadUpdate
    // Messages use message events from SavedMessages, see onLoad below
  ],

  messageCommands: [AntiraidClearCmd, SetAntiraidCmd, ViewAntiraidCmd],

  async beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.queue = new Queue();

    state.regexRunner = getRegExpRunner(`guild-${guild.id}`);

    state.recentActions = [];

    state.recentSpam = [];

    state.recentNicknameChanges = new Map();

    state.ignoredRoleChanges = new Set();

    state.cooldownManager = new CooldownManager();

    state.logs = new GuildLogs(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.antiraidLevels = GuildAntiraidLevels.getGuildInstance(guild.id);
    state.archives = GuildArchives.getGuildInstance(guild.id);

    state.cachedAntiraidLevel = await state.antiraidLevels.get();
  },

  async afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.clearRecentActionsInterval = setInterval(() => clearOldRecentActions(pluginData), 1 * MINUTES);
    state.clearRecentSpamInterval = setInterval(() => clearOldRecentSpam(pluginData), 1 * SECONDS);
    state.clearRecentNicknameChangesInterval = setInterval(
      () => clearOldRecentNicknameChanges(pluginData),
      30 * SECONDS,
    );

    state.onMessageCreateFn = (message) => runAutomodOnMessage(pluginData, message, false);
    state.savedMessages.events.on("create", state.onMessageCreateFn);

    state.onMessageUpdateFn = (message) => runAutomodOnMessage(pluginData, message, true);
    state.savedMessages.events.on("update", state.onMessageUpdateFn);
    const countersPlugin = pluginData.getPlugin(CountersPlugin);

    state.onCounterTrigger = (name, triggerName, channelId, userId) => {
      runAutomodOnCounterTrigger(pluginData, name, triggerName, channelId, userId, false);
    };

    state.onCounterReverseTrigger = (name, triggerName, channelId, userId) => {
      runAutomodOnCounterTrigger(pluginData, name, triggerName, channelId, userId, true);
    };
    countersPlugin.onCounterEvent("trigger", state.onCounterTrigger);
    countersPlugin.onCounterEvent("reverseTrigger", state.onCounterReverseTrigger);

    const modActionsEvents = pluginData.getPlugin(ModActionsPlugin).getEventEmitter();
    state.modActionsListeners = new Map();
    state.modActionsListeners.set("note", (userId: string) => runAutomodOnModAction(pluginData, "note", userId));
    state.modActionsListeners.set("warn", (userId: string, reason: string | undefined, isAutomodAction: boolean) =>
      runAutomodOnModAction(pluginData, "warn", userId, reason, isAutomodAction),
    );
    state.modActionsListeners.set("kick", (userId: string, reason: string | undefined, isAutomodAction: boolean) =>
      runAutomodOnModAction(pluginData, "kick", userId, reason, isAutomodAction),
    );
    state.modActionsListeners.set("ban", (userId: string, reason: string | undefined, isAutomodAction: boolean) =>
      runAutomodOnModAction(pluginData, "ban", userId, reason, isAutomodAction),
    );
    state.modActionsListeners.set("unban", (userId: string) => runAutomodOnModAction(pluginData, "unban", userId));
    registerEventListenersFromMap(modActionsEvents, state.modActionsListeners);

    const mutesEvents = pluginData.getPlugin(MutesPlugin).getEventEmitter();
    state.mutesListeners = new Map();
    state.mutesListeners.set("mute", (userId: string, reason: string | undefined, isAutomodAction: boolean) =>
      runAutomodOnModAction(pluginData, "mute", userId, reason, isAutomodAction),
    );
    state.mutesListeners.set("unmute", (userId: string) => runAutomodOnModAction(pluginData, "unmute", userId));
    registerEventListenersFromMap(mutesEvents, state.mutesListeners);
  },

  async beforeUnload(pluginData) {
    const { state, guild } = pluginData;

    const countersPlugin = pluginData.getPlugin(CountersPlugin);
    if (state.onCounterTrigger) {
      countersPlugin.offCounterEvent("trigger", state.onCounterTrigger);
    }
    if (state.onCounterReverseTrigger) {
      countersPlugin.offCounterEvent("reverseTrigger", state.onCounterReverseTrigger);
    }

    const modActionsEvents = pluginData.getPlugin(ModActionsPlugin).getEventEmitter();
    if (state.modActionsListeners) {
      unregisterEventListenersFromMap(modActionsEvents, state.modActionsListeners);
    }

    const mutesEvents = pluginData.getPlugin(MutesPlugin).getEventEmitter();
    if (state.mutesListeners) {
      unregisterEventListenersFromMap(mutesEvents, state.mutesListeners);
    }

    state.queue.clear();

    discardRegExpRunner(`guild-${guild.id}`);

    if (state.clearRecentActionsInterval) {
      clearInterval(state.clearRecentActionsInterval);
    }

    if (state.clearRecentSpamInterval) {
      clearInterval(state.clearRecentSpamInterval);
    }

    if (state.clearRecentNicknameChangesInterval) {
      clearInterval(state.clearRecentNicknameChangesInterval);
    }

    if (state.onMessageCreateFn) {
      state.savedMessages.events.off("create", state.onMessageCreateFn);
    }
    if (state.onMessageUpdateFn) {
      state.savedMessages.events.off("update", state.onMessageUpdateFn);
    }
  },
});
