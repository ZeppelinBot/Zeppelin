import { BasePluginType } from "knub";
import { z } from "zod";
import { Configs } from "../../data/Configs.js";
import Timeout = NodeJS.Timeout;

export const zGuildConfigReloaderPlugin = z.strictObject({});

export interface GuildConfigReloaderPluginType extends BasePluginType {
  config: z.infer<typeof zGuildConfigReloaderPlugin>;
  state: {
    guildConfigs: Configs;
    unloaded: boolean;
    highestConfigId: number;
    nextCheckTimeout: Timeout;
  };
}
