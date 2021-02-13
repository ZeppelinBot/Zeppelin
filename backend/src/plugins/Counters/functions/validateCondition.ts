import { GuildPluginData } from "knub";
import { CountersPluginType } from "../types";
import { parseCondition } from "../../../data/GuildCounters";

export function validateCondition(pluginData: GuildPluginData<CountersPluginType>, condition: string) {
  const parsed = parseCondition(condition);
  return parsed != null;
}
