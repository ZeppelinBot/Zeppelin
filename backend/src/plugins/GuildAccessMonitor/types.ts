import { BasePluginType } from "knub";
import { z } from "zod/v4";
import { AllowedGuilds } from "../../data/AllowedGuilds.js";

export const zGuildAccessMonitorConfig = z.strictObject({});

export interface GuildAccessMonitorPluginType extends BasePluginType {
  configSchema: typeof zGuildAccessMonitorConfig;
  state: {
    allowedGuilds: AllowedGuilds;
  };
}
