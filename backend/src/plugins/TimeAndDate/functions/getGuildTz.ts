import { PluginData } from "knub";
import { ZeppelinGuildConfig } from "../../../types";
import { TimeAndDatePluginType } from "../types";

export function getGuildTz(pluginData: PluginData<TimeAndDatePluginType>) {
  return pluginData.config.get().timezone;
}
