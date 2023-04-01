import { GuildPluginData } from "knub";
import { startProfiling } from "../../../utils/easyProfiler";
import { RecentActionType } from "../constants";
import { AutomodPluginType } from "../types";

export function findRecentSpam(
  pluginData: GuildPluginData<AutomodPluginType>,
  type: RecentActionType,
  identifier?: string,
) {
  const stopProfiling = startProfiling(pluginData.getKnubInstance().profiler, "automod:fns:findRecentSpam");
  const result = pluginData.state.recentSpam.find((spam) => {
    return spam.type === type && (!identifier || spam.identifiers.includes(identifier));
  });
  stopProfiling();
  return result;
}
