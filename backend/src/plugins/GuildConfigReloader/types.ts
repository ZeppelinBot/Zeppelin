import { BasePluginType } from "knub";
import { z } from "zod/v4";
import { Configs } from "../../data/Configs.js";

export const zGuildConfigReloaderPluginConfig = z.strictObject({});

export interface GuildConfigReloaderPluginType extends BasePluginType {
  configSchema: typeof zGuildConfigReloaderPluginConfig;
  state: {
    guildConfigs: Configs;
    unloaded: boolean;
    highestConfigId: number;
    nextCheckTimeout: NodeJS.Timeout;
  };
}
