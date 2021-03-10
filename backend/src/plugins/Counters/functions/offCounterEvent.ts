import { CounterEventEmitter, CountersPluginType } from "../types";
import { GuildPluginData } from "knub";

export function offCounterEvent(
  pluginData: GuildPluginData<CountersPluginType>,
  ...rest: Parameters<CounterEventEmitter["off"]>
) {
  return pluginData.state.events.off(...rest);
}
