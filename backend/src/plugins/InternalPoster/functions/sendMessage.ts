import { Message, MessageOptions, NewsChannel, TextChannel, WebhookClient } from "discord.js";
import { GuildPluginData } from "knub";
import { InternalPosterPluginType } from "../types";
import { getOrCreateWebhookForChannel } from "./getOrCreateWebhookForChannel";
import { APIMessage } from "discord-api-types";
import { isDiscordAPIError } from "../../../utils";

export type InternalPosterMessageResult = {
  id: string;
  channelId: string;
};

/**
 * Sends a message using a webhook or direct API requests, preferring webhooks when possible.
 */
export async function sendMessage(
  pluginData: GuildPluginData<InternalPosterPluginType>,
  channel: TextChannel | NewsChannel,
  content: MessageOptions,
): Promise<InternalPosterMessageResult> {
  return pluginData.state.queue.add(async () => {
    if (!pluginData.state.webhookClientCache.has(channel.id)) {
      const webhookInfo = await getOrCreateWebhookForChannel(pluginData, channel);
      if (webhookInfo) {
        const client = new WebhookClient({
          id: webhookInfo[0],
          token: webhookInfo[1],
        });
        pluginData.state.webhookClientCache.set(channel.id, client);
      } else {
        pluginData.state.webhookClientCache.set(channel.id, null);
      }
    }

    const webhookClient = pluginData.state.webhookClientCache.get(channel.id);
    if (webhookClient) {
      return webhookClient
        .send({
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
            await pluginData.state.webhooks.delete(webhookClient.id);
            pluginData.state.webhookClientCache.delete(channel.id);

            // Fallback to regular message for this log message
            return channel.send(content).then((message) => ({
              id: message.id,
              channelId: message.channelId,
            }));
          }

          throw err;
        });
    }

    return channel.send(content).then((message) => ({
      id: message.id,
      channelId: message.channelId,
    }));
  });
}
