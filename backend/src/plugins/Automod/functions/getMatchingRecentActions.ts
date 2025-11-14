import { GuildPluginData } from "vety";
import { startProfiling } from "../../../utils/easyProfiler.js";
import { RecentActionType } from "../constants.js";
import { AutomodPluginType } from "../types.js";

export function getMatchingRecentActions(
  pluginData: GuildPluginData<AutomodPluginType>,
  type: RecentActionType,
  identifier: string | null,
  since: number,
  to?: number,
) {
  const stopProfiling = startProfiling(pluginData.getVetyInstance().profiler, "automod:fns:getMatchingRecentActions");
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
