import { GuildPluginData } from "vety";
import { CountersPluginType } from "../types.js";

export function getPrettyNameForCounterTrigger(
  pluginData: GuildPluginData<CountersPluginType>,
  counterName: string,
  triggerName: string,
) {
  const config = pluginData.config.get();
  const counter = config.counters[counterName];
  if (!counter) {
    return "Unknown Counter Trigger";
  }

  const trigger = counter.triggers[triggerName];
  return trigger ? trigger.pretty_name || triggerName : "Unknown Counter Trigger";
}
