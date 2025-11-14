import { GuildPluginData } from "vety";
import { defaultDateFormats } from "../defaultDateFormats.js";
import { TimeAndDatePluginType } from "../types.js";

export function getDateFormat(
  pluginData: GuildPluginData<TimeAndDatePluginType>,
  formatName: keyof typeof defaultDateFormats,
) {
  return pluginData.config.get().date_formats?.[formatName] || defaultDateFormats[formatName];
}
