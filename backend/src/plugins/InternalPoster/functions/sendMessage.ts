import { GuildTextBasedChannel, Message, MessageOptions, NewsChannel, TextChannel, WebhookClient } from "discord.js";
import { GuildPluginData } from "knub";
import { InternalPosterPluginType } from "../types";
import { channelIsWebhookable, getOrCreateWebhookForChannel } from "./getOrCreateWebhookForChannel";
import { APIMessage } from "discord-api-types";
import { isDiscordAPIError } from "../../../utils";
import { getOrCreateWebhookClientForChannel } from "./getOrCreateWebhookClientForChannel";

export type InternalPosterMessageResult = {
  id: string;
  channelId: string;
};

async function sendDirectly(
  channel: GuildTextBasedChannel,
  content: MessageOptions,
): Promise<InternalPosterMessageResult | null> {
  return channel.send(content).then((message) => ({
    id: message.id,
    channelId: message.channelId,
  }));
}

/**
 * Sends a message using a webhook or direct API requests, preferring webhooks when possible.
 */
export async function sendMessage(
  pluginData: GuildPluginData<InternalPosterPluginType>,
  channel: GuildTextBasedChannel,
  content: MessageOptions,
): Promise<InternalPosterMessageResult | null> {
  return pluginData.state.queue.add(async () => {
    let webhookClient: WebhookClient | null = null;
    let threadId: string | undefined;
    if (channelIsWebhookable(channel)) {
      webhookClient = await getOrCreateWebhookClientForChannel(pluginData, channel);
    } else if (channel.isThread() && channelIsWebhookable(channel.parent!)) {
      webhookClient = await getOrCreateWebhookClientForChannel(pluginData, channel.parent!);
      threadId = channel.id;
    }

    if (!webhookClient) {
      return sendDirectly(channel, content);
    }

    return webhookClient
      .send({
        threadId,
        ...content,
        ...(pluginData.client.user && {
          username: pluginData.client.user.username,
          avatarURL: pluginData.client.user.avatarURL() || pluginData.client.user.defaultAvatarURL,
        }),
      })
      .then((apiMessage) => ({
        id: apiMessage.id,
        channelId: apiMessage.channel_id,
      }))
      .catch(async (err) => {
        // Unknown Webhook
        if (isDiscordAPIError(err) && err.code === 10015) {
          await pluginData.state.webhooks.delete(webhookClient!.id);
          pluginData.state.webhookClientCache.delete(channel.id);

          // Fallback to regular message for this log message
          return sendDirectly(channel, content);
        }

        throw err;
      });
  });
}
