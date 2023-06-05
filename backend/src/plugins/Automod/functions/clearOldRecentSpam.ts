import { GuildPluginData } from "knub";
import { startProfiling } from "../../../utils/easyProfiler";
import { RECENT_SPAM_EXPIRY_TIME } from "../constants";
import { AutomodPluginType } from "../types";

export function clearOldRecentSpam(pluginData: GuildPluginData<AutomodPluginType>) {
  const stopProfiling = startProfiling(pluginData.getKnubInstance().profiler, "automod:fns:clearOldRecentSpam");
  const now = Date.now();
  pluginData.state.recentSpam = pluginData.state.recentSpam.filter((spam) => {
    return spam.timestamp + RECENT_SPAM_EXPIRY_TIME > now;
  });
  stopProfiling();
}
