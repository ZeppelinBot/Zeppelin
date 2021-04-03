import { AutomodContext, AutomodPluginType } from "../types";
import { GuildPluginData } from "knub";
import { RECENT_ACTION_EXPIRY_TIME, RecentActionType } from "../constants";
import { getEmojiInString, getRoleMentions, getUrlsInString, getUserMentions } from "../../../utils";

export function clearRecentActionsForMessage(pluginData: GuildPluginData<AutomodPluginType>, context: AutomodContext) {
  const message = context.message!;
  const globalIdentifier = message.user_id;
  const perChannelIdentifier = `${message.channel_id}-${message.user_id}`;

  pluginData.state.recentActions = pluginData.state.recentActions.filter(act => {
    return act.identifier !== globalIdentifier && act.identifier !== perChannelIdentifier;
  });
}
