import { CountersPluginType, TTrigger } from "../types";
import { GuildPluginData } from "knub";

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

  const trigger = counter.triggers[triggerName] as TTrigger | undefined;
  return trigger ? trigger.pretty_name || trigger.name : "Unknown Counter Trigger";
}
