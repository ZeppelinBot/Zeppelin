import { BasePluginType } from "knub";
import z from "zod/v4";

export const zCommonConfig = z.strictObject({
  success_emoji: z.string().default("✅"),
  error_emoji: z.string().default("❌"),
  attachment_storing_channel: z.nullable(z.string()).default(null),
});

export interface CommonPluginType extends BasePluginType {
  configSchema: typeof zCommonConfig;
}
