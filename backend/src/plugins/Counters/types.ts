import * as t from "io-ts";
import { BasePluginType } from "knub";
import { GuildCounters } from "../../data/GuildCounters";
import { tDelayString, tNullable } from "../../utils";
import { EventEmitter } from "events";
import { CounterTrigger } from "../../data/entities/CounterTrigger";
import Timeout = NodeJS.Timeout;

export const Counter = t.type({
  per_channel: t.boolean,
  per_user: t.boolean,
  initial_value: t.number,
  decay: tNullable(
    t.type({
      amount: t.number,
      every: tDelayString,
    }),
  ),
});
export type TCounter = t.TypeOf<typeof Counter>;

export const ConfigSchema = t.type({
  counters: t.record(t.string, Counter),
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface CounterEvents {
  trigger: (name: string, condition: string, channelId: string | null, userId: string | null) => void;
  reverseTrigger: (name: string, condition: string, channelId: string | null, userId: string | null) => void;
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
    counterTriggersByCounterId: Map<number, Map<number, CounterTrigger>>;
  };
}
