import { PluginData } from "knub";
import { DateFormats } from "../types";

const defaultDateFormats: DateFormats = {
  date: "MMM D, YYYY",
  time: "H:mm",
  pretty_datetime: "MMM D, YYYY [at] H:mm z",
};

/**
 * Returns the guild-specific date format, falling back to the defaults if one has not been specified
 */
export function getDateFormat(pluginData: PluginData<any>, formatName: keyof DateFormats) {
  return pluginData.guildConfig.date_formats?.[formatName] || defaultDateFormats[formatName];
}

export const DBDateFormat = "YYYY-MM-DD HH:mm:ss";
