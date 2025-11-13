import { GuildPluginData } from "vety";
import { CountersPluginType } from "../types.js";

export function counterExists(pluginData: GuildPluginData<CountersPluginType>, counterName: string) {
  const config = pluginData.config.get();
  return config.counters[counterName] != null;
}
