import { WebhookSchema } from "#database/schema";

export class Webhook extends WebhookSchema {
  static table = "webhooks";
}

export default Webhook;
