import { PluginData } from "knub";
import { getDefaultPrefix } from "knub/dist/commands/commandUtils";

export function getGuildPrefix(pluginData: PluginData<any>) {
  return pluginData.guildConfig.prefix || getDefaultPrefix(pluginData.client);
}
