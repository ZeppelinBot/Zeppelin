import { BasePluginType } from "knub";
import { Configs } from "../../data/Configs.js";
import Timeout = NodeJS.Timeout;
import { z } from "zod";

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
