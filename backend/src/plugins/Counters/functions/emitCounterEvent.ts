import { GuildPluginData } from "vety";
import { CounterEvents, CountersPluginType } from "../types.js";

export function emitCounterEvent<TEvent extends keyof CounterEvents>(
  pluginData: GuildPluginData<CountersPluginType>,
  event: TEvent,
  ...rest: Parameters<CounterEvents[TEvent]>
) {
  return pluginData.state.events.emit(event, ...rest);
}
