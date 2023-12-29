import { Message, MessageEditOptions, WebhookClient, WebhookMessageEditOptions } from "discord.js";
import { GuildPluginData } from "knub";
import { isDiscordAPIError, noop } from "../../../utils";
import { InternalPosterPluginType } from "../types";

/**
 * Sends a message using a webhook or direct API requests, preferring webhooks when possible.
 */
export async function editMessage(
  pluginData: GuildPluginData<InternalPosterPluginType>,
  message: Message,
  content: MessageEditOptions & WebhookMessageEditOptions,
): Promise<void> {
  const channel = message.channel;
  if (!channel.isTextBased()) {
    return;
  }

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
