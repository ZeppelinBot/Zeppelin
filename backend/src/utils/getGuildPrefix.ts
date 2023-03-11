import { GuildPluginData } from "knub";
import { getDefaultPrefix } from "knub/dist/commands/commandUtils";

export function getGuildPrefix(pluginData: GuildPluginData<any>) {
  // @ts-expect-error: discord.js version mismatch
  return pluginData.fullConfig.prefix || getDefaultPrefix(pluginData.client);
}
