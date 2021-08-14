import { EventEmitter } from "events";
import * as t from "io-ts";
import { BasePluginType } from "knub";
import { CounterTrigger } from "../../data/entities/CounterTrigger";
import { GuildCounters } from "../../data/GuildCounters";
import { tDelayString, tNullable } from "../../utils";
import Timeout = NodeJS.Timeout;

export const Trigger = t.type({
  name: t.string,
  pretty_name: tNullable(t.string),
  condition: t.string,
  reverse_condition: t.string,
});
export type TTrigger = t.TypeOf<typeof Trigger>;

export const Counter = t.type({
  name: t.string,
  pretty_name: tNullable(t.string),
  per_channel: t.boolean,
  per_user: t.boolean,
  initial_value: t.number,
  triggers: t.record(t.string, t.union([t.string, Trigger])),
  decay: tNullable(
    t.type({
      amount: t.number,
      every: tDelayString,
    }),
  ),
  can_view: tNullable(t.boolean),
  can_edit: tNullable(t.boolean),
  can_reset_all: tNullable(t.boolean),
});
export type TCounter = t.TypeOf<typeof Counter>;

export const ConfigSchema = t.type({
  counters: t.record(t.string, Counter),
  can_view: t.boolean,
  can_edit: t.boolean,
  can_reset_all: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface CounterEvents {
  trigger: (counterName: string, triggerName: string, channelId: string | null, userId: string | null) => void;
  reverseTrigger: (counterName: string, triggerName: string, channelId: string | null, userId: string | null) => void;
}

export interface CounterEventEmitter extends EventEmitter {
  on<U extends keyof CounterEvents>(event: U, listener: CounterEvents[U]): this;
  emit<U extends keyof CounterEvents>(event: U, ...args: Parameters<CounterEvents[U]>): boolean;
}

export interface CountersPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    counters: GuildCounters;
    counterIds: Record<string, number>;
    decayTimers: Timeout[];
    events: CounterEventEmitter;
    counterTriggersByCounterId: Map<number, CounterTrigger[]>;
  };
}
