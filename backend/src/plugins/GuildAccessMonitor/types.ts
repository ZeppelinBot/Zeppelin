import { BasePluginType } from "vety";
import { z } from "zod";
import { AllowedGuilds } from "../../data/AllowedGuilds.js";

export const zGuildAccessMonitorConfig = z.strictObject({});

export interface GuildAccessMonitorPluginType extends BasePluginType {
  configSchema: typeof zGuildAccessMonitorConfig;
  state: {
    allowedGuilds: AllowedGuilds;
  };
}
