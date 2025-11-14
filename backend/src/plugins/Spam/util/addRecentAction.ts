import { GuildPluginData } from "vety";
import { RecentActionType, SpamPluginType } from "../types.js";

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
