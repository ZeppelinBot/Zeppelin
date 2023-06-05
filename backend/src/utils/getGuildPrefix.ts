import { getDefaultMessageCommandPrefix, GuildPluginData } from "knub";

export function getGuildPrefix(pluginData: GuildPluginData<any>) {
  return pluginData.fullConfig.prefix || getDefaultMessageCommandPrefix(pluginData.client);
}
