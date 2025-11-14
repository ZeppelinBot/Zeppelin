import { getDefaultMessageCommandPrefix, GuildPluginData } from "vety";

export function getGuildPrefix(pluginData: GuildPluginData<any>) {
  return pluginData.fullConfig.prefix || getDefaultMessageCommandPrefix(pluginData.client);
}
