import { WebhookClient } from "discord.js";
import { BasePluginType } from "knub";
import { z } from "zod";
import { Queue } from "../../Queue.js";
import { Webhooks } from "../../data/Webhooks.js";

export const zInternalPosterConfig = z.strictObject({});

export interface InternalPosterPluginType extends BasePluginType {
  config: z.infer<typeof zInternalPosterConfig>;
  state: {
    queue: Queue;
    webhooks: Webhooks;
    missingPermissions: boolean;
    webhookClientCache: Map<string, WebhookClient | null>;
  };
}
