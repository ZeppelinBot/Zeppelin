import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";

export function isLogIgnored(pluginData: GuildPluginData<LogsPluginType>, type: LogType, ignoreId: string) {
  return pluginData.state.guildLogs.isLogIgnored(type, ignoreId);
}
