import { WebhookClient } from "discord.js";
import * as t from "io-ts";
import { BasePluginType } from "knub";
import { Queue } from "../../Queue";
import { Webhooks } from "../../data/Webhooks";

export const ConfigSchema = t.type({});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface InternalPosterPluginType extends BasePluginType {
  config: TConfigSchema;

  state: {
    queue: Queue;
    webhooks: Webhooks;
    missingPermissions: boolean;
    webhookClientCache: Map<string, WebhookClient | null>;
  };
}
