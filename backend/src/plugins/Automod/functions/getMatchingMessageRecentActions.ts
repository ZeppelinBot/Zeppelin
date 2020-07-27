import { PluginData } from "knub";
import { AutomodPluginType } from "../types";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import moment from "moment-timezone";
import { getMatchingRecentActions } from "./getMatchingRecentActions";
import { RecentActionType } from "../constants";

export function getMatchingMessageRecentActions(
  pluginData: PluginData<AutomodPluginType>,
  message: SavedMessage,
  type: RecentActionType,
  count: number,
  within: number,
  perChannel: boolean,
) {
  const since = moment.utc(message.posted_at).valueOf() - within;
  const to = moment.utc(message.posted_at).valueOf();
  const identifier = perChannel ? `${message.channel_id}-${message.user_id}` : message.user_id;
  const recentActions = getMatchingRecentActions(pluginData, type, identifier, since, to);
  const totalCount = recentActions.reduce((total, action) => total + action.count, 0);

  if (totalCount >= count) {
    return {
      identifier,
      recentActions,
    };
  }
}
