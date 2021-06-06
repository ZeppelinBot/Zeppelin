import { GuildPluginData } from "knub";
import { CounterEvents, CountersPluginType } from "../types";

export function emitCounterEvent<TEvent extends keyof CounterEvents>(
  pluginData: GuildPluginData<CountersPluginType>,
  event: TEvent,
  ...rest: Parameters<CounterEvents[TEvent]>
) {
  return pluginData.state.events.emit(event, ...rest);
}
