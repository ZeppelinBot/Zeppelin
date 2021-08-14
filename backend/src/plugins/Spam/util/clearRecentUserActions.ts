import { GuildPluginData } from "knub";
import { RecentActionType, SpamPluginType } from "../types";

export function clearRecentUserActions(
  pluginData: GuildPluginData<SpamPluginType>,
  type: RecentActionType,
  userId: string,
  actionGroupId: string,
) {
  pluginData.state.recentActions = pluginData.state.recentActions.filter(action => {
    return action.type !== type || action.userId !== userId || action.actionGroupId !== actionGroupId;
  });
}
