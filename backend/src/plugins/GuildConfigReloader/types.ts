import { BasePluginType } from "knub";
import { TConfigSchema } from "../Mutes/types";
import { Configs } from "../../data/Configs";
import Timeout = NodeJS.Timeout;

export interface GuildConfigReloaderPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    guildConfigs: Configs;
    unloaded: boolean;
    highestConfigId: number;
    nextCheckTimeout: Timeout;
  };
}
