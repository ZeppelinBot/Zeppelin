import { disableInlineCode, isSnowflake } from "../utils";
import { getChannelIdFromMessageId } from "../data/getChannelIdFromMessageId";
import { GuildPluginData, TypeConversionError } from "knub";
import { TextChannel } from "eris";

const channelAndMessageIdRegex = /^(\d+)[\-\/](\d+)$/;
const messageLinkRegex = /^https:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/\d+\/(\d+)\/(\d+)$/i;

export interface MessageTarget {
  channel: TextChannel;
  messageId: string;
}

export async function resolveMessageTarget(pluginData: GuildPluginData<any>, value: string) {
  const result = await (async () => {
    if (isSnowflake(value)) {
      const channelId = await getChannelIdFromMessageId(value);
      if (!channelId) {
        return null;
      }

      return {
        channelId,
        messageId: value,
      };
    }

    const channelAndMessageIdMatch = value.match(channelAndMessageIdRegex);
    if (channelAndMessageIdMatch) {
      return {
        channelId: channelAndMessageIdMatch[1],
        messageId: channelAndMessageIdMatch[2],
      };
    }

    const messageLinkMatch = value.match(messageLinkRegex);
    if (messageLinkMatch) {
      return {
        channelId: messageLinkMatch[1],
        messageId: messageLinkMatch[2],
      };
    }
  })();

  if (!result) {
    return null;
  }

  const channel = pluginData.guild.channels.get(result.channelId);
  if (!channel || !(channel instanceof TextChannel)) {
    return null;
  }

  return {
    channel,
    messageId: result.messageId,
  };
}
