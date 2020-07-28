import { PluginData } from "knub";
import { AutomodPluginType } from "../types";
import { RECENT_NICKNAME_CHANGE_EXPIRY_TIME, RECENT_SPAM_EXPIRY_TIME } from "../constants";

export function clearOldRecentNicknameChanges(pluginData: PluginData<AutomodPluginType>) {
  const now = Date.now();
  for (const [userId, { timestamp }] of pluginData.state.recentNicknameChanges) {
    if (timestamp + RECENT_NICKNAME_CHANGE_EXPIRY_TIME <= now) {
      pluginData.state.recentNicknameChanges.delete(userId);
    }
  }
}
