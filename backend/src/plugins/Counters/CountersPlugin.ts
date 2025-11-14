import { EventEmitter } from "events";
import { PluginOverride, guildPlugin } from "vety";
import { GuildCounters } from "../../data/GuildCounters.js";
import {
  CounterTrigger,
  buildCounterConditionString,
  getReverseCounterComparisonOp,
  parseCounterConditionString,
} from "../../data/entities/CounterTrigger.js";
import { makePublicFn } from "../../pluginUtils.js";
import { MINUTES, convertDelayStringToMS } from "../../utils.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { AddCounterCmd } from "./commands/AddCounterCmd.js";
import { CountersListCmd } from "./commands/CountersListCmd.js";
import { ResetAllCounterValuesCmd } from "./commands/ResetAllCounterValuesCmd.js";
import { ResetCounterCmd } from "./commands/ResetCounterCmd.js";
import { SetCounterCmd } from "./commands/SetCounterCmd.js";
import { ViewCounterCmd } from "./commands/ViewCounterCmd.js";
import { changeCounterValue } from "./functions/changeCounterValue.js";
import { counterExists } from "./functions/counterExists.js";
import { decayCounter } from "./functions/decayCounter.js";
import { getPrettyNameForCounter } from "./functions/getPrettyNameForCounter.js";
import { getPrettyNameForCounterTrigger } from "./functions/getPrettyNameForCounterTrigger.js";
import { offCounterEvent } from "./functions/offCounterEvent.js";
import { onCounterEvent } from "./functions/onCounterEvent.js";
import { setCounterValue } from "./functions/setCounterValue.js";
import { CountersPluginType, zCountersConfig } from "./types.js";

const DECAY_APPLY_INTERVAL = 5 * MINUTES;

const defaultOverrides: Array<PluginOverride<CountersPluginType>> = [
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
];

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
export const CountersPlugin = guildPlugin<CountersPluginType>()({
  name: "counters",

  configSchema: zCountersConfig,
  defaultOverrides,

  public(pluginData) {
    return {
      counterExists: makePublicFn(pluginData, counterExists),
      changeCounterValue: makePublicFn(pluginData, changeCounterValue),
      setCounterValue: makePublicFn(pluginData, setCounterValue),
      getPrettyNameForCounter: makePublicFn(pluginData, getPrettyNameForCounter),
      getPrettyNameForCounterTrigger: makePublicFn(pluginData, getPrettyNameForCounterTrigger),
      onCounterEvent: makePublicFn(pluginData, onCounterEvent),
      offCounterEvent: makePublicFn(pluginData, offCounterEvent),
    };
  },

  // prettier-ignore
  messageCommands: [
    CountersListCmd,
    ViewCounterCmd,
    AddCounterCmd,
    SetCounterCmd,
    ResetCounterCmd,
    ResetAllCounterValuesCmd,
  ],

  async beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.counters = new GuildCounters(guild.id);
    state.events = new EventEmitter() as any;
    state.counterTriggersByCounterId = new Map();

    const activeTriggerIds: number[] = [];

    // Initialize and store the IDs of each of the counters internally
    state.counterIds = {};
    const config = pluginData.config.get();
    for (const [counterName, counter] of Object.entries(config.counters)) {
      const dbCounter = await state.counters.findOrCreateCounter(counterName, counter.per_channel, counter.per_user);
      state.counterIds[counterName] = dbCounter.id;

      const thisCounterTriggers: CounterTrigger[] = [];
      state.counterTriggersByCounterId.set(dbCounter.id, thisCounterTriggers);

      // Initialize triggers
      for (const [triggerName, trigger] of Object.entries(counter.triggers)) {
        const parsedCondition = parseCounterConditionString(trigger.condition)!;
        const rawReverseCondition =
          trigger.reverse_condition ||
          buildCounterConditionString(getReverseCounterComparisonOp(parsedCondition[0]), parsedCondition[1]);
        const parsedReverseCondition = parseCounterConditionString(rawReverseCondition)!;
        const counterTrigger = await state.counters.initCounterTrigger(
          dbCounter.id,
          triggerName,
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
    await state.counters.markUnusedCountersToBeDeleted([...Object.values(state.counterIds)]);

    // Mark old/unused triggers to be deleted later
    await state.counters.markUnusedTriggersToBeDeleted(activeTriggerIds);
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  async afterLoad(pluginData) {
    const { state } = pluginData;

    const config = pluginData.config.get();

    // Start decay timers
    state.decayTimers = [];
    for (const [counterName, counter] of Object.entries(config.counters)) {
      if (!counter.decay) {
        continue;
      }

      const decay = counter.decay;
      const decayPeriodMs = convertDelayStringToMS(decay.every)!;
      if (decayPeriodMs === 0) {
        continue;
      }

      state.decayTimers.push(
        setInterval(() => {
          decayCounter(pluginData, counterName, decayPeriodMs, decay.amount);
        }, DECAY_APPLY_INTERVAL),
      );
    }
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    if (state.decayTimers) {
      for (const interval of state.decayTimers) {
        clearInterval(interval);
      }
    }

    (state.events as any).removeAllListeners();
  },
});
