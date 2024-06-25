import { EventEmitter } from "events";
import { BasePluginType } from "knub";
import z from "zod";
import { GuildCounters, MAX_COUNTER_VALUE, MIN_COUNTER_VALUE } from "../../data/GuildCounters.js";
import {
  CounterTrigger,
  buildCounterConditionString,
  getReverseCounterComparisonOp,
  parseCounterConditionString,
} from "../../data/entities/CounterTrigger.js";
import { zBoundedCharacters, zBoundedRecord, zDelayString } from "../../utils.js";
import Timeout = NodeJS.Timeout;

const MAX_COUNTERS = 5;
const MAX_TRIGGERS_PER_COUNTER = 5;

export const zTrigger = z
  .strictObject({
    // Dummy type because name gets replaced by the property key in transform()
    name: z
      .never()
      .optional()
      .transform(() => ""),
    pretty_name: zBoundedCharacters(0, 100).nullable().default(null),
    condition: zBoundedCharacters(1, 64).refine((str) => parseCounterConditionString(str) !== null, {
      message: "Invalid counter trigger condition",
    }),
    reverse_condition: zBoundedCharacters(1, 64)
      .refine((str) => parseCounterConditionString(str) !== null, {
        message: "Invalid counter trigger reverse condition",
      })
      .optional(),
  })
  .transform((val, ctx) => {
    const ruleName = String(ctx.path[ctx.path.length - 1]).trim();

    let reverseCondition = val.reverse_condition;
    if (!reverseCondition) {
      const parsedCondition = parseCounterConditionString(val.condition)!;
      reverseCondition = buildCounterConditionString(
        getReverseCounterComparisonOp(parsedCondition[0]),
        parsedCondition[1],
      );
    }

    return {
      ...val,
      name: ruleName,
      reverse_condition: reverseCondition,
    };
  });

const zTriggerFromString = zBoundedCharacters(0, 100).transform((val, ctx) => {
  const ruleName = String(ctx.path[ctx.path.length - 1]).trim();
  const parsedCondition = parseCounterConditionString(val);
  if (!parsedCondition) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid counter trigger condition",
    });
    return z.NEVER;
  }
  return {
    name: ruleName,
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
  // Typed as "never" because you are not expected to supply this directly.
  // The transform instead picks it up from the property key and the output type is a string.
  name: z
    .never()
    .optional()
    .transform((_, ctx) => {
      const ruleName = String(ctx.path[ctx.path.length - 2]).trim();
      if (!ruleName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Counters must have names",
        });
        return z.NEVER;
      }
      return ruleName;
    }),
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
  can_view: z.boolean().default(false),
  can_edit: z.boolean().default(false),
  can_reset_all: z.boolean().default(false),
});

export const zCountersConfig = z.strictObject({
  counters: zBoundedRecord(z.record(zBoundedCharacters(0, 100), zCounter), 0, MAX_COUNTERS),
  can_view: z.boolean(),
  can_edit: z.boolean(),
  can_reset_all: z.boolean(),
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
  config: z.infer<typeof zCountersConfig>;
  state: {
    counters: GuildCounters;
    counterIds: Record<string, number>;
    decayTimers: Timeout[];
    events: CounterEventEmitter;
    counterTriggersByCounterId: Map<number, CounterTrigger[]>;
  };
}
