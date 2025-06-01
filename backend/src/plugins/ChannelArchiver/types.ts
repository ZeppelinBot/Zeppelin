import { BasePluginType, guildPluginMessageCommand, pluginUtils } from "knub";
import { z } from "zod/v4";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zChannelArchiverPluginConfig = z.strictObject({});

export interface ChannelArchiverPluginType extends BasePluginType {
  configSchema: typeof zChannelArchiverPluginConfig;
  state: {
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const channelArchiverCmd = guildPluginMessageCommand<ChannelArchiverPluginType>();
