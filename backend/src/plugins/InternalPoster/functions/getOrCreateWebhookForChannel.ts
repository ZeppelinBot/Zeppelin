import { GuildBasedChannel, PermissionsBitField } from "discord.js";
import { GuildPluginData } from "knub";
import { isDiscordAPIError } from "../../../utils";
import { InternalPosterPluginType } from "../types";

type WebhookInfo = [id: string, token: string];

export type WebhookableChannel = Extract<GuildBasedChannel, { createWebhook: (...args: any[]) => any }>;

export function channelIsWebhookable(channel: GuildBasedChannel): channel is WebhookableChannel {
  return "createWebhook" in channel;
}

export async function getOrCreateWebhookForChannel(
  pluginData: GuildPluginData<InternalPosterPluginType>,
  channel: WebhookableChannel,
): Promise<WebhookInfo | null> {
  // Database cache
  const fromDb = await pluginData.state.webhooks.findByChannelId(channel.id);
  if (fromDb) {
    return [fromDb.id, fromDb.token];
  }

  if (pluginData.state.missingPermissions) {
    return null;
  }

  // Create new webhook
  const member = pluginData.client.user && pluginData.guild.members.cache.get(pluginData.client.user.id);
  if (!member || member.permissions.has(PermissionsBitField.Flags.ManageWebhooks)) {
    try {
      const webhook = await channel.createWebhook({ name: `Zephook ${channel.id}` });
      await pluginData.state.webhooks.create({
        id: webhook.id,
        guild_id: pluginData.guild.id,
        channel_id: channel.id,
        token: webhook.token!,
      });
      return [webhook.id, webhook.token!];
    } catch (err) {
      // tslint:disable-next-line:no-console
      console.warn(`Error when trying to create webhook for ${pluginData.guild.id}/${channel.id}: ${err.message}`);

      if (isDiscordAPIError(err) && err.code === 50013) {
        pluginData.state.missingPermissions = true;
      }

      return null;
    }
  }

  return null;
}
