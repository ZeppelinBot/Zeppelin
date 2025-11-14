import { BasePluginType } from "vety";
import { z } from "zod";
import { Configs } from "../../data/Configs.js";
import Timeout = NodeJS.Timeout;

export const zGuildConfigReloaderPluginConfig = z.strictObject({});

export interface GuildConfigReloaderPluginType extends BasePluginType {
  configSchema: typeof zGuildConfigReloaderPluginConfig;
  state: {
    guildConfigs: Configs;
    unloaded: boolean;
    highestConfigId: number;
    nextCheckTimeout: Timeout;
  };
}
