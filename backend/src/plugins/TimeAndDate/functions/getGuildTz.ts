import { GuildPluginData } from "knub";
import { ZeppelinGuildConfig } from "../../../types";
import { TimeAndDatePluginType } from "../types";

export function getGuildTz(pluginData: GuildPluginData<TimeAndDatePluginType>) {
  return pluginData.config.get().timezone;
}
