import { GuildPluginData } from "knub";
import { InternalPosterPluginType } from "../types";
import { NewsChannel, TextChannel, WebhookClient } from "discord.js";
import { getOrCreateWebhookForChannel } from "./getOrCreateWebhookForChannel";

export async function getOrCreateWebhookClientForChannel(
  pluginData: GuildPluginData<InternalPosterPluginType>,
  channel: TextChannel | NewsChannel,
): Promise<WebhookClient | null> {
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

  return pluginData.state.webhookClientCache.get(channel.id) ?? null;
}
