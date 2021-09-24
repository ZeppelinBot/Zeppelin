import { BasePluginType } from "knub";
import { AllowedGuilds } from "../../data/AllowedGuilds";

export interface GuildInfoSaverPluginType extends BasePluginType {
  state: {
    updateInterval: NodeJS.Timeout;
  };
}
