import { PluginData } from "knub";
import { defaultDateFormats } from "../defaultDateFormats";

export function getDateFormat(pluginData: PluginData<any>, formatName: keyof typeof defaultDateFormats) {
  return pluginData.config.get().date_formats?.[formatName] || defaultDateFormats[formatName];
}
