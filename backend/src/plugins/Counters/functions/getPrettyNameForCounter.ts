import { GuildPluginData } from "vety";
import { CountersPluginType } from "../types.js";

export function getPrettyNameForCounter(pluginData: GuildPluginData<CountersPluginType>, counterName: string) {
  const config = pluginData.config.get();
  const counter = config.counters[counterName];
  return counter ? counter.pretty_name || counterName : "Unknown Counter";
}
