import { GuildPluginData } from "knub";
import { defaultDateFormats } from "../defaultDateFormats";
import { TimeAndDatePluginType } from "../types";

export function getDateFormat(
  pluginData: GuildPluginData<TimeAndDatePluginType>,
  formatName: keyof typeof defaultDateFormats,
) {
  return pluginData.config.get().date_formats?.[formatName] || defaultDateFormats[formatName];
}
