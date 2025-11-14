import { BasePluginType } from "vety";
import { z } from "zod";

export const zPhishermanConfig = z.strictObject({
  api_key: z.string().max(255).nullable().default(null),
});

export interface PhishermanPluginType extends BasePluginType {
  configSchema: typeof zPhishermanConfig;
  // eslint-disable-next-line @typescript-eslint/ban-types
  state: {};
}
