import { GuildPluginData } from "knub";
import { CommonPluginType } from "../types.js";
import { env } from "../../../env.js";

export function getSuccessEmoji(pluginData: GuildPluginData<CommonPluginType>) {
  return pluginData.config.get().success_emoji ?? env.DEFAULT_SUCCESS_EMOJI;
}

export function getErrorEmoji(pluginData: GuildPluginData<CommonPluginType>) {
  return pluginData.config.get().error_emoji ?? env.DEFAULT_ERROR_EMOJI;
}
