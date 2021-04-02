import { CountersPluginType } from "../types";
import { GuildPluginData } from "knub";

export function getPrettyNameForCounter(pluginData: GuildPluginData<CountersPluginType>, counterName: string) {
  const config = pluginData.config.get();
  const counter = config.counters[counterName];
  return counter ? counter.pretty_name || counter.name : "Unknown Counter";
}
