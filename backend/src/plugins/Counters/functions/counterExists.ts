import { GuildPluginData } from "knub";
import { CountersPluginType } from "../types";

export function counterExists(pluginData: GuildPluginData<CountersPluginType>, counterName: string) {
  const config = pluginData.config.get();
  return config.counters[counterName] != null;
}
