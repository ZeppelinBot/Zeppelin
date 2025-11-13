import { GuildPluginData } from "vety";
import { CounterEventEmitter, CountersPluginType } from "../types.js";

export function offCounterEvent(
  pluginData: GuildPluginData<CountersPluginType>,
  ...rest: Parameters<CounterEventEmitter["off"]>
) {
  return pluginData.state.events.off(...rest);
}
