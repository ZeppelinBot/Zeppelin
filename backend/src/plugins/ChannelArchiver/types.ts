import { BasePluginType, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zChannelArchiverPluginConfig = z.strictObject({});

export interface ChannelArchiverPluginType extends BasePluginType {
  configSchema: typeof zChannelArchiverPluginConfig;
  state: {
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const channelArchiverCmd = guildPluginMessageCommand<ChannelArchiverPluginType>();
