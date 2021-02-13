import { CounterEvents, CountersPluginType } from "../types";
import { GuildPluginData } from "knub";

export function onCounterEvent<TEvent extends keyof CounterEvents>(
  pluginData: GuildPluginData<CountersPluginType>,
  event: TEvent,
  listener: CounterEvents[TEvent],
) {
  return pluginData.state.events.on(event, listener);
}
