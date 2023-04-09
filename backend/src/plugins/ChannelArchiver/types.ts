import { BasePluginType, guildPluginMessageCommand } from "knub";

export interface ChannelArchiverPluginType extends BasePluginType {
  state: {};
}

export const channelArchiverCmd = guildPluginMessageCommand<ChannelArchiverPluginType>();
