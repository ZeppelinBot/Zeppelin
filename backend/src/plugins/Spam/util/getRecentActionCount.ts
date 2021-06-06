import { GuildPluginData } from "knub";
import { RecentActionType, SpamPluginType } from "../types";

export function getRecentActionCount(
  pluginData: GuildPluginData<SpamPluginType>,
  type: RecentActionType,
  userId: string,
  actionGroupId: string,
  since: number,
): number {
  return pluginData.state.recentActions.reduce((count, action) => {
    if (action.timestamp < since) return count;
    if (action.type !== type) return count;
    if (action.actionGroupId !== actionGroupId) return count;
    if (action.userId !== userId) return count;
    return count + action.count;
  }, 0);
}
