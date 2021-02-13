import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, CountersPluginType } from "./types";
import { GuildCounters } from "../../data/GuildCounters";
import { mapToPublicFn } from "../../pluginUtils";
import { changeCounterValue } from "./functions/changeCounterValue";
import { setCounterValue } from "./functions/setCounterValue";
import { convertDelayStringToMS, MINUTES, SECONDS } from "../../utils";
import { EventEmitter } from "events";
import { onCounterEvent } from "./functions/onCounterEvent";
import { offCounterEvent } from "./functions/offCounterEvent";
import { emitCounterEvent } from "./functions/emitCounterEvent";
import { ConfigPreprocessorFn } from "knub/dist/config/configTypes";
import { initCounterTrigger } from "./functions/initCounterTrigger";
import { decayCounter } from "./functions/decayCounter";
import { validateCondition } from "./functions/validateCondition";
import { StrictValidationError } from "../../validatorUtils";

const MAX_COUNTERS = 5;
const DECAY_APPLY_INTERVAL = 5 * MINUTES;

const defaultOptions = {
  config: {
    counters: {},
  },
};

const configPreprocessor: ConfigPreprocessorFn<CountersPluginType> = options => {
  for (const counter of Object.values(options.config?.counters || {})) {
    counter.per_user = counter.per_user ?? false;
    counter.per_channel = counter.per_channel ?? false;
    counter.initial_value = counter.initial_value ?? 0;
  }

  if (Object.values(options.config?.counters || {}).length > MAX_COUNTERS) {
    throw new StrictValidationError([`You can only have at most ${MAX_COUNTERS} active counters`]);
  }

  return options;
};

/**
 * The Counters plugin keeps track of simple integer values that are tied to a user, channel, both, or neither — "counters".
 * These values can be changed using the functions in the plugin's public interface.
 * These values can also be set to automatically decay over time.
 *
 * Triggers can be registered that check for a specific condition, e.g. "when this counter is over 100".
 * Triggers are checked against every time a counter's value changes, and will emit an event when triggered.
 * A single trigger can only trigger once per user/channel/in general, depending on how specific the counter is (e.g. a per-user trigger can only trigger once per user).
 * After being triggered, a trigger is "reset" if the counter value no longer matches the trigger (e.g. drops to 100 or below in the above example). After this, that trigger can be triggered again.
 */
export const CountersPlugin = zeppelinGuildPlugin<CountersPluginType>()("counters", {
  configSchema: ConfigSchema,
  defaultOptions,
  configPreprocessor,

  public: {
    // Change a counter's value by a relative amount, e.g. +5
    changeCounterValue: mapToPublicFn(changeCounterValue),
    // Set a counter's value to an absolute value
    setCounterValue: mapToPublicFn(setCounterValue),

    // Initialize a trigger. Once initialized, events will be fired when this trigger is triggered.
    initCounterTrigger: mapToPublicFn(initCounterTrigger),

    // Validate a trigger's condition string
    validateCondition: mapToPublicFn(validateCondition),

    onCounterEvent: mapToPublicFn(onCounterEvent),
    offCounterEvent: mapToPublicFn(offCounterEvent),
  },

  async onLoad(pluginData) {
    pluginData.state.counters = new GuildCounters(pluginData.guild.id);
    pluginData.state.events = new EventEmitter();

    // Initialize and store the IDs of each of the counters internally
    pluginData.state.counterIds = {};
    const config = pluginData.config.get();
    for (const [counterName, counter] of Object.entries(config.counters)) {
      const dbCounter = await pluginData.state.counters.findOrCreateCounter(
        counterName,
        counter.per_channel,
        counter.per_user,
      );
      pluginData.state.counterIds[counterName] = dbCounter.id;
    }

    // Mark old/unused counters to be deleted later
    await pluginData.state.counters.markUnusedCountersToBeDeleted([...Object.values(pluginData.state.counterIds)]);

    // Start decay timers
    pluginData.state.decayTimers = [];
    for (const [counterName, counter] of Object.entries(config.counters)) {
      if (!counter.decay) {
        continue;
      }

      const decay = counter.decay;
      const decayPeriodMs = convertDelayStringToMS(decay.every)!;
      pluginData.state.decayTimers.push(
        setInterval(() => {
          decayCounter(pluginData, counterName, decayPeriodMs, decay.amount);
        }, DECAY_APPLY_INTERVAL),
      );
    }

    // Initially set the counter trigger map to just an empty map
    // The actual triggers are added by other plugins via initCounterTrigger()
    pluginData.state.counterTriggersByCounterId = new Map();

    // Mark all triggers to be deleted later. This is cancelled/reset when a plugin adds the trigger again via initCounterTrigger().
    await pluginData.state.counters.markAllTriggersTobeDeleted();
  },

  onUnload(pluginData) {
    for (const interval of pluginData.state.decayTimers) {
      clearInterval(interval);
    }

    pluginData.state.events.removeAllListeners();
  },
});
