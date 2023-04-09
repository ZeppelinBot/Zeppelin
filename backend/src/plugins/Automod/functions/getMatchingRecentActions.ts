import { GuildPluginData } from "knub";
import { startProfiling } from "../../../utils/easyProfiler";
import { RecentActionType } from "../constants";
import { AutomodPluginType } from "../types";

export function getMatchingRecentActions(
  pluginData: GuildPluginData<AutomodPluginType>,
  type: RecentActionType,
  identifier: string | null,
  since: number,
  to?: number,
) {
  const stopProfiling = startProfiling(pluginData.getKnubInstance().profiler, "automod:fns:getMatchingRecentActions");
  to = to || Date.now();

  const result = pluginData.state.recentActions.filter((action) => {
    return (
      action.type === type &&
      (!identifier || action.identifier === identifier) &&
      action.context.timestamp >= since &&
      action.context.timestamp <= to! &&
      !action.context.actioned
    );
  });
  stopProfiling();
  return result;
}
