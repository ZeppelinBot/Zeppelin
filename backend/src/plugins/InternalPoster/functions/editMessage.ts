import {
  Message,
  MessageEditOptions,
  NewsChannel,
  TextChannel,
  WebhookClient,
  WebhookEditMessageOptions,
} from "discord.js";
import { GuildPluginData } from "knub";
import { InternalPosterPluginType } from "../types";
import { isDiscordAPIError, noop } from "../../../utils";

/**
 * Sends a message using a webhook or direct API requests, preferring webhooks when possible.
 */
export async function editMessage(
  pluginData: GuildPluginData<InternalPosterPluginType>,
  message: Message,
  content: MessageEditOptions & WebhookEditMessageOptions,
): Promise<void> {
  if (!(message.channel instanceof TextChannel || message.channel instanceof NewsChannel)) {
    return;
  }

  const channel = message.channel as TextChannel | NewsChannel;

  await pluginData.state.queue.add(async () => {
    if (message.webhookId) {
      const webhook = await pluginData.state.webhooks.find(message.webhookId);
      if (!webhook) {
        // Webhook message but we're missing the token -> can't edit
        return;
      }

      const webhookClient = new WebhookClient({
        id: webhook.id,
        token: webhook.token,
      });
      await webhookClient.editMessage(message.id, content).catch(async (err) => {
        // Unknown Webhook, remove from DB
        if (isDiscordAPIError(err) && err.code === 10015) {
          await pluginData.state.webhooks.delete(webhookClient.id);
          return;
        }

        throw err;
      });
      return;
    }

    await message.edit(content).catch(noop);
  });
}
