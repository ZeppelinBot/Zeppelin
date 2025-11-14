import { GuildPluginData } from "vety";
import { TimeAndDatePluginType } from "../types.js";

export function getGuildTz(pluginData: GuildPluginData<TimeAndDatePluginType>) {
  return pluginData.config.get().timezone;
}
