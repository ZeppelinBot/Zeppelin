import { Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { getEmojiInString, getRoleMentions, getUrlsInString, getUserMentions } from "../../../utils";
import { RecentActionType, SpamPluginType } from "../types";
import { logAndDetectMessageSpam } from "./logAndDetectMessageSpam";

export async function onMessageCreate(pluginData: GuildPluginData<SpamPluginType>, savedMessage: SavedMessage) {
  if (savedMessage.is_bot) return;

  const member = pluginData.guild.members.cache.get(savedMessage.user_id as Snowflake);
  const config = await pluginData.config.getMatchingConfig({
    userId: savedMessage.user_id,
    channelId: savedMessage.channel_id,
    member,
  });

  const maxMessages = config.max_messages;
  if (maxMessages) {
    logAndDetectMessageSpam(pluginData, savedMessage, RecentActionType.Message, maxMessages, 1, "too many messages");
  }

  const maxMentions = config.max_mentions;
  const mentions = savedMessage.data.content
    ? [...getUserMentions(savedMessage.data.content), ...getRoleMentions(savedMessage.data.content)]
    : [];
  if (maxMentions && mentions.length) {
    logAndDetectMessageSpam(
      pluginData,
      savedMessage,
      RecentActionType.Mention,
      maxMentions,
      mentions.length,
      "too many mentions",
    );
  }

  const maxLinks = config.max_links;
  if (maxLinks && savedMessage.data.content && typeof savedMessage.data.content === "string") {
    const links = getUrlsInString(savedMessage.data.content);
    logAndDetectMessageSpam(pluginData, savedMessage, RecentActionType.Link, maxLinks, links.length, "too many links");
  }

  const maxAttachments = config.max_attachments;
  if (maxAttachments && savedMessage.data.attachments) {
    logAndDetectMessageSpam(
      pluginData,
      savedMessage,
      RecentActionType.Attachment,
      maxAttachments,
      savedMessage.data.attachments.length,
      "too many attachments",
    );
  }

  const maxEmojis = config.max_emojis;
  if (maxEmojis && savedMessage.data.content) {
    const emojiCount = getEmojiInString(savedMessage.data.content).length;
    logAndDetectMessageSpam(pluginData, savedMessage, RecentActionType.Emoji, maxEmojis, emojiCount, "too many emoji");
  }

  const maxNewlines = config.max_newlines;
  if (maxNewlines && savedMessage.data.content) {
    const newlineCount = (savedMessage.data.content.match(/\n/g) || []).length;
    logAndDetectMessageSpam(
      pluginData,
      savedMessage,
      RecentActionType.Newline,
      maxNewlines,
      newlineCount,
      "too many newlines",
    );
  }

  const maxCharacters = config.max_characters;
  if (maxCharacters && savedMessage.data.content) {
    const characterCount = [...savedMessage.data.content.trim()].length;
    logAndDetectMessageSpam(
      pluginData,
      savedMessage,
      RecentActionType.Character,
      maxCharacters,
      characterCount,
      "too many characters",
    );
  }

  // TODO: Max duplicates check
}
