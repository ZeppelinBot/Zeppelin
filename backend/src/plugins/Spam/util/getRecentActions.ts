import { GuildPluginData } from "knub";
import { RecentActionType, SpamPluginType } from "../types";

export function getRecentActions(
  pluginData: GuildPluginData<SpamPluginType>,
  type: RecentActionType,
  userId: string,
  actionGroupId: string,
  since: number,
) {
  return pluginData.state.recentActions.filter(action => {
    if (action.timestamp < since) return false;
    if (action.type !== type) return false;
    if (action.actionGroupId !== actionGroupId) return false;
    if (action.userId !== userId) return false;
    return true;
  });
}
