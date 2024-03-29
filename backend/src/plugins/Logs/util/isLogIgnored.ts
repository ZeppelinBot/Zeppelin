import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { LogsPluginType } from "../types";

export function isLogIgnored(
  pluginData: GuildPluginData<LogsPluginType>,
  type: keyof typeof LogType,
  ignoreId: string,
) {
  return pluginData.state.guildLogs.isLogIgnored(type, ignoreId);
}
