import { GuildPluginData } from "knub";
import { RECENT_ACTION_EXPIRY_TIME } from "../constants";
import { AutomodPluginType } from "../types";

export function clearOldRecentActions(pluginData: GuildPluginData<AutomodPluginType>) {
  const now = Date.now();
  pluginData.state.recentActions = pluginData.state.recentActions.filter(info => {
    return info.context.timestamp + RECENT_ACTION_EXPIRY_TIME > now;
  });
}
