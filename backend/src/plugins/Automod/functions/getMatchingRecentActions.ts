import { GuildPluginData } from "knub";
import { AutomodPluginType } from "../types";
import { RecentActionType } from "../constants";

export function getMatchingRecentActions(
  pluginData: GuildPluginData<AutomodPluginType>,
  type: RecentActionType,
  identifier: string | null,
  since: number,
  to?: number,
) {
  to = to || Date.now();

  return pluginData.state.recentActions.filter(action => {
    return (
      action.type === type &&
      (!identifier || action.identifier === identifier) &&
      action.context.timestamp >= since &&
      action.context.timestamp <= to &&
      !action.context.actioned
    );
  });
}
