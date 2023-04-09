import { WebhookClient } from "discord.js";
import * as t from "io-ts";
import { BasePluginType } from "knub";
import { Webhooks } from "../../data/Webhooks";
import { Queue } from "../../Queue";

export const ConfigSchema = t.type({});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

// <channelId, webhookUrl>
type ChannelWebhookMap = Map<string, string>;

export interface InternalPosterPluginType extends BasePluginType {
  config: TConfigSchema;

  state: {
    queue: Queue;
    webhooks: Webhooks;
    missingPermissions: boolean;
    webhookClientCache: Map<string, WebhookClient | null>;
  };
}
