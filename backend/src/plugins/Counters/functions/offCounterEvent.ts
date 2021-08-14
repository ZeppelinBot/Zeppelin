import { GuildPluginData } from "knub";
import { CounterEventEmitter, CountersPluginType } from "../types";

export function offCounterEvent(
  pluginData: GuildPluginData<CountersPluginType>,
  ...rest: Parameters<CounterEventEmitter["off"]>
) {
  return pluginData.state.events.off(...rest);
}
