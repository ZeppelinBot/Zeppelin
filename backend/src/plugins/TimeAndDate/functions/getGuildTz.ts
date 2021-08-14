import { GuildPluginData } from "knub";
import { TimeAndDatePluginType } from "../types";

export function getGuildTz(pluginData: GuildPluginData<TimeAndDatePluginType>) {
  return pluginData.config.get().timezone;
}
