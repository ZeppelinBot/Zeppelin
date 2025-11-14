import { BasePluginType } from "vety";
import { z } from "zod";

export const zGuildInfoSaverConfig = z.strictObject({});

export interface GuildInfoSaverPluginType extends BasePluginType {
  configSchema: typeof zGuildInfoSaverConfig;
  state: {
    updateInterval: NodeJS.Timeout;
  };
}
