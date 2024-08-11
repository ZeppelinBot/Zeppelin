import { BasePluginType, guildPluginMessageCommand, pluginUtils } from "knub";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export interface ChannelArchiverPluginType extends BasePluginType {
  state: {
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const channelArchiverCmd = guildPluginMessageCommand<ChannelArchiverPluginType>();
