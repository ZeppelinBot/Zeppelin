import { BasePluginType, guildCommand } from "knub";

export interface ChannelArchiverPluginType extends BasePluginType {
  state: {};
}

export const channelArchiverCmd = guildCommand<ChannelArchiverPluginType>();
