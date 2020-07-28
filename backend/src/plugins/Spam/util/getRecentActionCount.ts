import { RecentActionType } from "../types";

export function getRecentActionCount(
  pluginData,
  type: RecentActionType,
  userId: string,
  actionGroupId: string,
  since: number,
) {
  return pluginData.state.recentActions.reduce((count, action) => {
    if (action.timestamp < since) return count;
    if (action.type !== type) return count;
    if (action.actionGroupId !== actionGroupId) return count;
    if (action.userId !== userId) return false;
    return count + action.count;
  }, 0);
}
