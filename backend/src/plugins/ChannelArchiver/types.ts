import { BasePluginType, guildPluginMessageCommand, pluginUtils } from "knub";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { z } from "zod/v4";

export const zChannelArchiverPluginConfig = z.strictObject({});

export interface ChannelArchiverPluginType extends BasePluginType {
  configSchema: typeof zChannelArchiverPluginConfig;
  state: {
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const channelArchiverCmd = guildPluginMessageCommand<ChannelArchiverPluginType>();
