import { WebhookClient } from "discord.js";
import { BasePluginType } from "vety";
import { z } from "zod";
import { Queue } from "../../Queue.js";
import { Webhooks } from "../../data/Webhooks.js";

export const zInternalPosterConfig = z.strictObject({}).default({});

export interface InternalPosterPluginType extends BasePluginType {
  configSchema: typeof zInternalPosterConfig;
  state: {
    queue: Queue;
    webhooks: Webhooks;
    missingPermissions: boolean;
    webhookClientCache: Map<string, WebhookClient | null>;
  };
}
