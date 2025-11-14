import { GuildPluginData } from "vety";
import { startProfiling } from "../../../utils/easyProfiler.js";
import { RECENT_SPAM_EXPIRY_TIME } from "../constants.js";
import { AutomodPluginType } from "../types.js";

export function clearOldRecentSpam(pluginData: GuildPluginData<AutomodPluginType>) {
  const stopProfiling = startProfiling(pluginData.getVetyInstance().profiler, "automod:fns:clearOldRecentSpam");
  const now = Date.now();
  pluginData.state.recentSpam = pluginData.state.recentSpam.filter((spam) => {
    return spam.timestamp + RECENT_SPAM_EXPIRY_TIME > now;
  });
  stopProfiling();
}
