import { BasePluginType, guildPluginMessageCommand } from "knub";

export interface ChannelArchiverPluginType extends BasePluginType {}

export const channelArchiverCmd = guildPluginMessageCommand<ChannelArchiverPluginType>();
