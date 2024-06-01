import { BasePluginType } from "knub";
import { z } from "zod";

export const zGuildInfoSaverConfig = z.strictObject({});

export interface GuildInfoSaverPluginType extends BasePluginType {
  config: z.infer<typeof zGuildInfoSaverConfig>;
  state: {
    updateInterval: NodeJS.Timeout;
  };
}
