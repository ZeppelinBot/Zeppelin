import { EventEmitter } from "events";
import { BasePluginType, pluginUtils } from "knub";
import z from "zod/v4";
import { GuildCounters, MAX_COUNTER_VALUE, MIN_COUNTER_VALUE } from "../../data/GuildCounters.js";
import {
  CounterTrigger,
  buildCounterConditionString,
  getReverseCounterComparisonOp,
  parseCounterConditionString,
} from "../../data/entities/CounterTrigger.js";
import { zBoundedCharacters, zBoundedRecord, zDelayString } from "../../utils.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

const MAX_COUNTERS = 5;
const MAX_TRIGGERS_PER_COUNTER = 5;

export const zTrigger = z.strictObject({
  // Dummy type because name gets replaced by the property key in transform()
  pretty_name: zBoundedCharacters(0, 100).nullable().default(null),
  condition: zBoundedCharacters(1, 64).refine((str) => parseCounterConditionString(str) !== null, {
    message: "Invalid counter trigger condition",
  }),
  reverse_condition: zBoundedCharacters(1, 64)
    .refine((str) => parseCounterConditionString(str) !== null, {
      message: "Invalid counter trigger reverse condition",
    })
    .optional(),
});

const zTriggerFromString = zBoundedCharacters(0, 100).transform((val, ctx) => {
  const parsedCondition = parseCounterConditionString(val);
  if (!parsedCondition) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid counter trigger condition",
    });
    return z.NEVER;
  }
  return {
    pretty_name: null,
    condition: buildCounterConditionString(parsedCondition[0], parsedCondition[1]),
    reverse_condition: buildCounterConditionString(
      getReverseCounterComparisonOp(parsedCondition[0]),
      parsedCondition[1],
    ),
  };
});

const zTriggerInput = z.union([zTrigger, zTriggerFromString]);

export const zCounter = z.strictObject({
  pretty_name: zBoundedCharacters(0, 100).nullable().default(null),
  per_channel: z.boolean().default(false),
  per_user: z.boolean().default(false),
  initial_value: z.number().min(MIN_COUNTER_VALUE).max(MAX_COUNTER_VALUE).default(0),
  triggers: zBoundedRecord(z.record(zBoundedCharacters(0, 100), zTriggerInput), 1, MAX_TRIGGERS_PER_COUNTER),
  decay: z
    .strictObject({
      amount: z.number(),
      every: zDelayString,
    })
    .nullable()
    .default(null),
  can_view: z.boolean().nullable().default(null),
  can_edit: z.boolean().nullable().default(null),
  can_reset_all: z.boolean().nullable().default(null),
});

export const zCountersConfig = z.strictObject({
  counters: zBoundedRecord(z.record(zBoundedCharacters(0, 100), zCounter), 0, MAX_COUNTERS).default({}),
  can_view: z.boolean().default(false),
  can_edit: z.boolean().default(false),
  can_reset_all: z.boolean().default(false),
});

export interface CounterEvents {
  trigger: (counterName: string, triggerName: string, channelId: string | null, userId: string | null) => void;
  reverseTrigger: (counterName: string, triggerName: string, channelId: string | null, userId: string | null) => void;
}

export interface CounterEventEmitter extends EventEmitter {
  on<U extends keyof CounterEvents>(event: U, listener: CounterEvents[U]): this;
  emit<U extends keyof CounterEvents>(event: U, ...args: Parameters<CounterEvents[U]>): boolean;
}

export interface CountersPluginType extends BasePluginType {
  configSchema: typeof zCountersConfig;
  state: {
    counters: GuildCounters;
    counterIds: Record<string, number>;
    decayTimers: NodeJS.Timeout[];
    events: CounterEventEmitter;
    counterTriggersByCounterId: Map<number, CounterTrigger[]>;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}
