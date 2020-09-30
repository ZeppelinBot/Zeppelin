import { BasePluginType } from "knub";
import { AllowedGuilds } from "../../data/AllowedGuilds";

export interface GuildInfoSaverPluginType extends BasePluginType {
  state: {
    allowedGuilds: AllowedGuilds;
    updateInterval: NodeJS.Timeout;
  };
}
