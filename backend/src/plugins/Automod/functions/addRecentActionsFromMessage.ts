import moment from "moment-timezone";
import { AutomodContext, AutomodPluginType } from "../types";
import { PluginData } from "knub";
import { RECENT_ACTION_EXPIRY_TIME, RecentActionType } from "../constants";
import { getEmojiInString, getRoleMentions, getUrlsInString, getUserMentions } from "../../../utils";

export function addRecentActionsFromMessage(pluginData: PluginData<AutomodPluginType>, context: AutomodContext) {
  const globalIdentifier = context.message.user_id;
  const perChannelIdentifier = `${context.message.channel_id}-${context.message.user_id}`;
  const expiresAt = Date.now() + RECENT_ACTION_EXPIRY_TIME;

  pluginData.state.recentActions.push({
    context,
    type: RecentActionType.Message,
    identifier: globalIdentifier,
    count: 1,
  });

  pluginData.state.recentActions.push({
    context,
    type: RecentActionType.Message,
    identifier: perChannelIdentifier,
    count: 1,
  });

  const mentionCount =
    getUserMentions(context.message.data.content || "").length +
    getRoleMentions(context.message.data.content || "").length;
  if (mentionCount) {
    pluginData.state.recentActions.push({
      context,
      type: RecentActionType.Mention,
      identifier: globalIdentifier,
      count: mentionCount,
    });

    pluginData.state.recentActions.push({
      context,
      type: RecentActionType.Mention,
      identifier: perChannelIdentifier,
      count: mentionCount,
    });
  }

  const linkCount = getUrlsInString(context.message.data.content || "").length;
  if (linkCount) {
    pluginData.state.recentActions.push({
      context,
      type: RecentActionType.Link,
      identifier: globalIdentifier,
      count: linkCount,
    });

    pluginData.state.recentActions.push({
      context,
      type: RecentActionType.Link,
      identifier: perChannelIdentifier,
      count: linkCount,
    });
  }

  const attachmentCount = context.message.data.attachments && context.message.data.attachments.length;
  if (attachmentCount) {
    pluginData.state.recentActions.push({
      context,
      type: RecentActionType.Attachment,
      identifier: globalIdentifier,
      count: attachmentCount,
    });

    pluginData.state.recentActions.push({
      context,
      type: RecentActionType.Attachment,
      identifier: perChannelIdentifier,
      count: attachmentCount,
    });
  }

  const emojiCount = getEmojiInString(context.message.data.content || "").length;
  if (emojiCount) {
    pluginData.state.recentActions.push({
      context,
      type: RecentActionType.Emoji,
      identifier: globalIdentifier,
      count: emojiCount,
    });

    pluginData.state.recentActions.push({
      context,
      type: RecentActionType.Emoji,
      identifier: perChannelIdentifier,
      count: emojiCount,
    });
  }

  // + 1 is for the first line of the message (which doesn't have a line break)
  const lineCount = context.message.data.content ? (context.message.data.content.match(/\n/g) || []).length + 1 : 0;
  if (lineCount) {
    pluginData.state.recentActions.push({
      context,
      type: RecentActionType.Line,
      identifier: globalIdentifier,
      count: lineCount,
    });

    pluginData.state.recentActions.push({
      context,
      type: RecentActionType.Line,
      identifier: perChannelIdentifier,
      count: lineCount,
    });
  }

  const characterCount = [...(context.message.data.content || "")].length;
  if (characterCount) {
    pluginData.state.recentActions.push({
      context,
      type: RecentActionType.Character,
      identifier: globalIdentifier,
      count: characterCount,
    });

    pluginData.state.recentActions.push({
      context,
      type: RecentActionType.Character,
      identifier: perChannelIdentifier,
      count: characterCount,
    });
  }
}
