import { GuildPluginData } from "vety";
import { startProfiling } from "../../../utils/easyProfiler.js";
import { RECENT_ACTION_EXPIRY_TIME } from "../constants.js";
import { AutomodPluginType } from "../types.js";

export function clearOldRecentActions(pluginData: GuildPluginData<AutomodPluginType>) {
  const stopProfiling = startProfiling(pluginData.getVetyInstance().profiler, "automod:fns:clearOldRecentActions");
  const now = Date.now();
  pluginData.state.recentActions = pluginData.state.recentActions.filter((info) => {
    return info.context.timestamp + RECENT_ACTION_EXPIRY_TIME > now;
  });
  stopProfiling();
}
