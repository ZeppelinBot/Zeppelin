import { BasePluginType } from "knub";
import z from "zod";

export const zPhishermanConfig = z.strictObject({
  api_key: z.string().max(255).nullable(),
});

export interface PhishermanPluginType extends BasePluginType {
  config: z.infer<typeof zPhishermanConfig>;

  state: {
    validApiKey: string | null;
  };
}
