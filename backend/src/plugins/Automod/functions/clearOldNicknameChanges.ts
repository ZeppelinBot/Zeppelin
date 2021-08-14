import { GuildPluginData } from "knub";
import { RECENT_NICKNAME_CHANGE_EXPIRY_TIME } from "../constants";
import { AutomodPluginType } from "../types";

export function clearOldRecentNicknameChanges(pluginData: GuildPluginData<AutomodPluginType>) {
  const now = Date.now();
  for (const [userId, { timestamp }] of pluginData.state.recentNicknameChanges) {
    if (timestamp + RECENT_NICKNAME_CHANGE_EXPIRY_TIME <= now) {
      pluginData.state.recentNicknameChanges.delete(userId);
    }
  }
}
