import { AutomodContext, AutomodPluginType } from "../types";
import { PluginData } from "knub";
import { RECENT_ACTION_EXPIRY_TIME, RecentActionType } from "../constants";
import { getEmojiInString, getRoleMentions, getUrlsInString, getUserMentions } from "../../../utils";

export function clearRecentActionsForMessage(pluginData: PluginData<AutomodPluginType>, context: AutomodContext) {
  const globalIdentifier = context.message.user_id;
  const perChannelIdentifier = `${context.message.channel_id}-${context.message.user_id}`;

  pluginData.state.recentActions = pluginData.state.recentActions.filter(act => {
    return act.identifier !== globalIdentifier && act.identifier !== perChannelIdentifier;
  });
}
