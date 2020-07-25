import { BasePluginType, command } from "knub";

export interface ChannelArchiverPluginType extends BasePluginType {
  state: {};
}

export const channelArchiverCmd = command<ChannelArchiverPluginType>();
