import { GuildPluginData } from "knub";
import { CounterEvents, CountersPluginType } from "../types";

export function onCounterEvent<TEvent extends keyof CounterEvents>(
  pluginData: GuildPluginData<CountersPluginType>,
  event: TEvent,
  listener: CounterEvents[TEvent],
) {
  return pluginData.state.events.on(event, listener);
}
