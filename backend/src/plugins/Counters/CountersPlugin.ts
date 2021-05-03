import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, CountersPluginType, TTrigger } from "./types";
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
import { decayCounter } from "./functions/decayCounter";
import { StrictValidationError } from "../../validatorUtils";
import { PluginOptions } from "knub";
import { ViewCounterCmd } from "./commands/ViewCounterCmd";
import { AddCounterCmd } from "./commands/AddCounterCmd";
import { SetCounterCmd } from "./commands/SetCounterCmd";
import {
  buildCounterConditionString,
  CounterTrigger,
  getReverseCounterComparisonOp,
  parseCounterConditionString,
} from "../../data/entities/CounterTrigger";
import { getPrettyNameForCounter } from "./functions/getPrettyNameForCounter";
import { getPrettyNameForCounterTrigger } from "./functions/getPrettyNameForCounterTrigger";
import { counterExists } from "./functions/counterExists";
import { ResetAllCounterValuesCmd } from "./commands/ResetAllCounterValuesCmd";
import { CountersListCmd } from "./commands/CountersListCmd";
import { ResetCounterCmd } from "./commands/ResetCounterCmd";

const MAX_COUNTERS = 5;
const MAX_TRIGGERS_PER_COUNTER = 5;
const DECAY_APPLY_INTERVAL = 5 * MINUTES;

const defaultOptions: PluginOptions<CountersPluginType> = {
  config: {
    counters: {},
    can_view: false,
    can_edit: false,
    can_reset_all: false,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_view: true,
      },
    },
    {
      level: ">=100",
      config: {
        can_edit: true,
      },
    },
  ],
};

const configPreprocessor: ConfigPreprocessorFn<CountersPluginType> = options => {
  for (const [counterName, counter] of Object.entries(options.config?.counters || {})) {
    counter.name = counterName;
    counter.per_user = counter.per_user ?? false;
    counter.per_channel = counter.per_channel ?? false;
    counter.initial_value = counter.initial_value ?? 0;
    counter.triggers = counter.triggers || {};

    if (Object.values(counter.triggers).length > MAX_TRIGGERS_PER_COUNTER) {
      throw new StrictValidationError([`You can only have at most ${MAX_TRIGGERS_PER_COUNTER} triggers per counter`]);
    }

    // Normalize triggers
    for (const [triggerName, trigger] of Object.entries(counter.triggers)) {
      const triggerObj: Partial<TTrigger> = typeof trigger === "string" ? { condition: trigger } : trigger;

      triggerObj.name = triggerName;
      const parsedCondition = parseCounterConditionString(triggerObj.condition || "");
      if (!parsedCondition) {
        throw new StrictValidationError([
          `Invalid comparison in counter trigger ${counterName}/${triggerName}: "${triggerObj.condition}"`,
        ]);
      }

      triggerObj.condition = buildCounterConditionString(parsedCondition[0], parsedCondition[1]);
      triggerObj.reverse_condition =
        triggerObj.reverse_condition ||
        buildCounterConditionString(getReverseCounterComparisonOp(parsedCondition[0]), parsedCondition[1]);

      counter.triggers[triggerName] = triggerObj as TTrigger;
    }
  }

  if (Object.values(options.config?.counters || {}).length > MAX_COUNTERS) {
    throw new StrictValidationError([`You can only have at most ${MAX_COUNTERS} counters`]);
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
  showInDocs: true,
  info: {
    prettyName: "Counters",
    description:
      "Keep track of per-user, per-channel, or global numbers and trigger specific actions based on this number",
    configurationGuide: "See <a href='/docs/setup-guides/counters'>Counters setup guide</a>",
  },

  configSchema: ConfigSchema,
  defaultOptions,
  configPreprocessor,

  public: {
    counterExists: mapToPublicFn(counterExists),

    // Change a counter's value by a relative amount, e.g. +5
    changeCounterValue: mapToPublicFn(changeCounterValue),

    // Set a counter's value to an absolute value
    setCounterValue: mapToPublicFn(setCounterValue),

    getPrettyNameForCounter: mapToPublicFn(getPrettyNameForCounter),
    getPrettyNameForCounterTrigger: mapToPublicFn(getPrettyNameForCounterTrigger),

    onCounterEvent: mapToPublicFn(onCounterEvent),
    offCounterEvent: mapToPublicFn(offCounterEvent),
  },

  // prettier-ignore
  commands: [
    CountersListCmd,
    ViewCounterCmd,
    AddCounterCmd,
    SetCounterCmd,
    ResetCounterCmd,
    ResetAllCounterValuesCmd,
  ],

  async onLoad(pluginData) {
    pluginData.state.counters = new GuildCounters(pluginData.guild.id);
    pluginData.state.events = new EventEmitter();
    pluginData.state.counterTriggersByCounterId = new Map();

    const activeTriggerIds: number[] = [];

    // Initialize and store the IDs of each of the counters internally
    pluginData.state.counterIds = {};
    const config = pluginData.config.get();
    for (const counter of Object.values(config.counters)) {
      const dbCounter = await pluginData.state.counters.findOrCreateCounter(
        counter.name,
        counter.per_channel,
        counter.per_user,
      );
      pluginData.state.counterIds[counter.name] = dbCounter.id;

      const thisCounterTriggers: CounterTrigger[] = [];
      pluginData.state.counterTriggersByCounterId.set(dbCounter.id, thisCounterTriggers);

      // Initialize triggers
      for (const trigger of Object.values(counter.triggers)) {
        const theTrigger = trigger as TTrigger;
        const parsedCondition = parseCounterConditionString(theTrigger.condition)!;
        const parsedReverseCondition = parseCounterConditionString(theTrigger.reverse_condition)!;
        const counterTrigger = await pluginData.state.counters.initCounterTrigger(
          dbCounter.id,
          theTrigger.name,
          parsedCondition[0],
          parsedCondition[1],
          parsedReverseCondition[0],
          parsedReverseCondition[1],
        );
        activeTriggerIds.push(counterTrigger.id);
        thisCounterTriggers.push(counterTrigger);
      }
    }

    // Mark old/unused counters to be deleted later
    await pluginData.state.counters.markUnusedCountersToBeDeleted([...Object.values(pluginData.state.counterIds)]);

    // Mark old/unused triggers to be deleted later
    await pluginData.state.counters.markUnusedTriggersToBeDeleted(activeTriggerIds);

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
  },

  onUnload(pluginData) {
    for (const interval of pluginData.state.decayTimers) {
      clearInterval(interval);
    }

    pluginData.state.events.removeAllListeners();
  },
});
