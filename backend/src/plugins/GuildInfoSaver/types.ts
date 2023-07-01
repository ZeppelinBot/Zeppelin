import { BasePluginType } from "knub";

export interface GuildInfoSaverPluginType extends BasePluginType {
  state: {
    updateInterval: NodeJS.Timeout;
  };
}
