import { RecentActionType } from "../types";

export function clearRecentUserActions(pluginData, type: RecentActionType, userId: string, actionGroupId: string) {
  pluginData.state.recentActions = pluginData.state.recentActions.filter(action => {
    return action.type !== type || action.userId !== userId || action.actionGroupId !== actionGroupId;
  });
}
