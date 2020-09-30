import { GuildPluginData } from "knub";
import { SpamPluginType, RecentActionType } from "../types";

export function addRecentAction(
  pluginData: GuildPluginData<SpamPluginType>,
  type: RecentActionType,
  userId: string,
  actionGroupId: string,
  extraData: any,
  timestamp: number,
  count = 1,
) {
  pluginData.state.recentActions.push({ type, userId, actionGroupId, extraData, timestamp, count });
}
