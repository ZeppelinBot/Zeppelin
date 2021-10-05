import { GuildPluginData } from "knub";
import { RECENT_ACTION_EXPIRY_TIME } from "../constants";
import { AutomodPluginType } from "../types";
import { startProfiling } from "../../../utils/easyProfiler";

export function clearOldRecentActions(pluginData: GuildPluginData<AutomodPluginType>) {
  const stopProfiling = startProfiling(pluginData.getKnubInstance().profiler, "automod:fns:clearOldRecentActions");
  const now = Date.now();
  pluginData.state.recentActions = pluginData.state.recentActions.filter((info) => {
    return info.context.timestamp + RECENT_ACTION_EXPIRY_TIME > now;
  });
  stopProfiling();
}
