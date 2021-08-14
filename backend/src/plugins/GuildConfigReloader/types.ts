import { BasePluginType } from "knub";
import { Configs } from "../../data/Configs";
import { TConfigSchema } from "../Mutes/types";
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
