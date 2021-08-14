import { GuildPluginData } from "knub";
import { RecentActionType } from "../constants";
import { AutomodPluginType } from "../types";

export function findRecentSpam(
  pluginData: GuildPluginData<AutomodPluginType>,
  type: RecentActionType,
  identifier?: string,
) {
  return pluginData.state.recentSpam.find(spam => {
    return spam.type === type && (!identifier || spam.identifiers.includes(identifier));
  });
}
