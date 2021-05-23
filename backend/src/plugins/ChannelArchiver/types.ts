import { BasePluginType, typedGuildCommand } from "knub";

export interface ChannelArchiverPluginType extends BasePluginType {
  state: {};
}

export const channelArchiverCmd = typedGuildCommand<ChannelArchiverPluginType>();
