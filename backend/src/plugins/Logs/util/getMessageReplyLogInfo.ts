import { GuildPluginData } from "knub";
import { ISavedMessageAttachmentData, SavedMessage } from "../../../data/entities/SavedMessage.js";
import { messageLink, messageSummary, useMediaUrls } from "../../../utils.js";
import { TemplateSafeValueContainer } from "../../../templateFormatter.js";
import { savedMessageToTemplateSafeSavedMessage, TemplateSafeSavedMessage } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";

export interface MessageReplyLogInfo {
  replyInfo: string;
  reply: TemplateSafeValueContainer | null;
}

export async function getMessageReplyLogInfo(
  pluginData: GuildPluginData<LogsPluginType>,
  message: SavedMessage,
): Promise<MessageReplyLogInfo> {
  const reference = message.data.reference;
  if (!reference?.messageId || !reference.channelId) {
    return { replyInfo: "", reply: null };
  }

  const link = messageLink(reference.guildId ?? message.guild_id, reference.channelId, reference.messageId);
  let replyInfo = `\n**Replied To:** [Jump to message](${link})`;

  const referencedMessage = await pluginData.state.savedMessages.find(reference.messageId, true);

  let timestamp: string | null = null;
  let summary: string | null = null;
  let timestampMs: number | null = null;
  let templateSafeMessage: TemplateSafeSavedMessage | null = null;

  if (referencedMessage) {
    if (referencedMessage.data.attachments) {
      for (const attachment of referencedMessage.data.attachments as ISavedMessageAttachmentData[]) {
        attachment.url = useMediaUrls(attachment.url);
      }
    }

    timestampMs = referencedMessage.data.timestamp;
    timestamp = `<t:${Math.floor(timestampMs / 1000)}>`;
    replyInfo += ` (posted at ${timestamp})`;

    summary = messageSummary(referencedMessage);
    if (summary) {
      replyInfo += `\n${summary}`;
    }

    templateSafeMessage = savedMessageToTemplateSafeSavedMessage(referencedMessage);
  }

  const reply = new TemplateSafeValueContainer({
    link,
    timestamp,
    timestampMs,
    summary,
    message: templateSafeMessage,
  });

  return { replyInfo, reply };
}
