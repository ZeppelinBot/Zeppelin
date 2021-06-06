import { GuildPluginData } from "knub";
import { CountersPluginType } from "../types";

export function getPrettyNameForCounter(pluginData: GuildPluginData<CountersPluginType>, counterName: string) {
  const config = pluginData.config.get();
  const counter = config.counters[counterName];
  return counter ? counter.pretty_name || counter.name : "Unknown Counter";
}
