import { PluginData } from "knub";
import { AutomodPluginType } from "../types";
import { RecentActionType } from "../constants";

export function findRecentSpam(pluginData: PluginData<AutomodPluginType>, type: RecentActionType, userId?: string) {
  return pluginData.state.recentSpam.find(spam => {
    return spam.type === type && (!userId || spam.userIds.includes(userId));
  });
}
