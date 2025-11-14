import { GuildPluginData } from "vety";
import moment from "moment-timezone";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { startProfiling } from "../../../utils/easyProfiler.js";
import { RecentActionType } from "../constants.js";
import { AutomodPluginType } from "../types.js";
import { getMatchingRecentActions } from "./getMatchingRecentActions.js";

export function getMatchingMessageRecentActions(
  pluginData: GuildPluginData<AutomodPluginType>,
  message: SavedMessage,
  type: RecentActionType,
  identifier: string,
  count: number,
  within: number,
) {
  const stopProfiling = startProfiling(
    pluginData.getVetyInstance().profiler,
    "automod:fns:getMatchingMessageRecentActions",
  );
  const since = moment.utc(message.posted_at).valueOf() - within;
  const to = moment.utc(message.posted_at).valueOf();
  const recentActions = getMatchingRecentActions(pluginData, type, identifier, since, to);
  const totalCount = recentActions.reduce((total, action) => total + action.count, 0);

  stopProfiling();
  if (totalCount >= count) {
    return {
      recentActions,
    };
  }
}
