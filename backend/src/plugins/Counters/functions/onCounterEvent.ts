import { GuildPluginData } from "vety";
import { CounterEvents, CountersPluginType } from "../types.js";

export function onCounterEvent<TEvent extends keyof CounterEvents>(
  pluginData: GuildPluginData<CountersPluginType>,
  event: TEvent,
  listener: CounterEvents[TEvent],
) {
  return pluginData.state.events.on(event, listener);
}
