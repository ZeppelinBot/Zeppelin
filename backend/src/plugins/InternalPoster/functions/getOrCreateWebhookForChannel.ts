import { GuildPluginData } from "knub";
import { InternalPosterPluginType } from "../types";
import { NewsChannel, Permissions, TextChannel } from "discord.js";
import { isDiscordAPIError } from "../../../utils";

type WebhookInfo = [id: string, token: string];

export async function getOrCreateWebhookForChannel(
  pluginData: GuildPluginData<InternalPosterPluginType>,
  channel: TextChannel | NewsChannel,
): Promise<WebhookInfo | null> {
  // tslint:disable-next-line:no-console FIXME: Here for debugging purposes
  console.log(`getOrCreateWebhookForChannel(${channel.id})`);

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
  if (!member || member.permissions.has(Permissions.FLAGS.MANAGE_WEBHOOKS)) {
    try {
      const webhook = await channel.createWebhook(`Zephook ${channel.id}`);
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
