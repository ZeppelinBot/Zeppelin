import { CooldownManager, guildPlugin } from "vety";
import { Queue } from "../../Queue.js";
import { GuildAntiraidLevels } from "../../data/GuildAntiraidLevels.js";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { discardRegExpRunner, getRegExpRunner } from "../../regExpRunners.js";
import { MINUTES, SECONDS } from "../../utils.js";
import { registerEventListenersFromMap } from "../../utils/registerEventListenersFromMap.js";
import { unregisterEventListenersFromMap } from "../../utils/unregisterEventListenersFromMap.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { CountersPlugin } from "../Counters/CountersPlugin.js";
import { InternalPosterPlugin } from "../InternalPoster/InternalPosterPlugin.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { ModActionsPlugin } from "../ModActions/ModActionsPlugin.js";
import { MutesPlugin } from "../Mutes/MutesPlugin.js";
import { PhishermanPlugin } from "../Phisherman/PhishermanPlugin.js";
import { RoleManagerPlugin } from "../RoleManager/RoleManagerPlugin.js";
import { AntiraidClearCmd } from "./commands/AntiraidClearCmd.js";
import { SetAntiraidCmd } from "./commands/SetAntiraidCmd.js";
import { ViewAntiraidCmd } from "./commands/ViewAntiraidCmd.js";
import { RunAutomodOnJoinEvt, RunAutomodOnLeaveEvt } from "./events/RunAutomodOnJoinLeaveEvt.js";
import { RunAutomodOnMemberUpdate } from "./events/RunAutomodOnMemberUpdate.js";
import { runAutomodOnCounterTrigger } from "./events/runAutomodOnCounterTrigger.js";
import { runAutomodOnMessage } from "./events/runAutomodOnMessage.js";
import { runAutomodOnModAction } from "./events/runAutomodOnModAction.js";
import {
  RunAutomodOnThreadCreate,
  RunAutomodOnThreadDelete,
  RunAutomodOnThreadUpdate,
} from "./events/runAutomodOnThreadEvents.js";
import { clearOldRecentNicknameChanges } from "./functions/clearOldNicknameChanges.js";
import { clearOldRecentActions } from "./functions/clearOldRecentActions.js";
import { clearOldRecentSpam } from "./functions/clearOldRecentSpam.js";
import { AutomodPluginType, zAutomodConfig } from "./types.js";
import { DebugAutomodCmd } from "./commands/DebugAutomodCmd.js";

export const AutomodPlugin = guildPlugin<AutomodPluginType>()({
  name: "automod",

  // prettier-ignore
  dependencies: () => [
    LogsPlugin,
    ModActionsPlugin,
    MutesPlugin,
    CountersPlugin,
    PhishermanPlugin,
    InternalPosterPlugin,
    RoleManagerPlugin,
  ],

  configSchema: zAutomodConfig,

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

  messageCommands: [AntiraidClearCmd, SetAntiraidCmd, ViewAntiraidCmd, DebugAutomodCmd],

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

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  async afterLoad(pluginData) {
    const { state } = pluginData;

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
