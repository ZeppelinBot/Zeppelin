import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { RecentActionType } from "../constants";
import { AutomodPluginType } from "../types";
import { getMatchingRecentActions } from "./getMatchingRecentActions";

export function getMatchingMessageRecentActions(
  pluginData: GuildPluginData<AutomodPluginType>,
  message: SavedMessage,
  type: RecentActionType,
  identifier: string,
  count: number,
  within: number,
) {
  const since = moment.utc(message.posted_at).valueOf() - within;
  const to = moment.utc(message.posted_at).valueOf();
  const recentActions = getMatchingRecentActions(pluginData, type, identifier, since, to);
  const totalCount = recentActions.reduce((total, action) => total + action.count, 0);

  if (totalCount >= count) {
    return {
      recentActions,
    };
  }
}
