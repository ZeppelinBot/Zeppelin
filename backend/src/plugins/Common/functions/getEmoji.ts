import { GuildPluginData } from "knub";
import { CommonPluginType } from "../types";

export function getSuccessEmoji(pluginData: GuildPluginData<CommonPluginType>) {
  return pluginData.config.get().success_emoji ?? "✅";
}

export function getErrorEmoji(pluginData: GuildPluginData<CommonPluginType>) {
  return pluginData.config.get().error_emoji ?? "❌";
}
