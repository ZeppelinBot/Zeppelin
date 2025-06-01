import { BasePluginType } from "knub";
import { z } from "zod/v4";

export const zGuildInfoSaverConfig = z.strictObject({});

export interface GuildInfoSaverPluginType extends BasePluginType {
  configSchema: typeof zGuildInfoSaverConfig;
  state: {
    updateInterval: NodeJS.Timeout;
  };
}
