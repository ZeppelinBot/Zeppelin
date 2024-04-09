import { WebhookClient } from "discord.js";
import { BasePluginType } from "knub";
import { Queue } from "../../Queue.js";
import { Webhooks } from "../../data/Webhooks.js";

export interface InternalPosterPluginType extends BasePluginType {
  state: {
    queue: Queue;
    webhooks: Webhooks;
    missingPermissions: boolean;
    webhookClientCache: Map<string, WebhookClient | null>;
  };
}
