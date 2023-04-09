import { BasePluginType } from "knub";
import { Configs } from "../../data/Configs";
import Timeout = NodeJS.Timeout;

export interface GuildConfigReloaderPluginType extends BasePluginType {
  config: {};
  state: {
    guildConfigs: Configs;
    unloaded: boolean;
    highestConfigId: number;
    nextCheckTimeout: Timeout;
  };
}
