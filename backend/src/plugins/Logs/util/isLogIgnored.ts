import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { LogsPluginType } from "../types.js";

export function isLogIgnored(
  pluginData: GuildPluginData<LogsPluginType>,
  type: keyof typeof LogType,
  ignoreId: string,
) {
  return pluginData.state.guildLogs.isLogIgnored(type, ignoreId);
}
