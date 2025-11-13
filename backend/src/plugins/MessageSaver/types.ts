import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zMessageSaverConfig = z.strictObject({
  can_manage: z.boolean().default(false),
});

export interface MessageSaverPluginType extends BasePluginType {
  configSchema: typeof zMessageSaverConfig;
  state: {
    savedMessages: GuildSavedMessages;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const messageSaverCmd = guildPluginMessageCommand<MessageSaverPluginType>();
export const messageSaverEvt = guildPluginEventListener<MessageSaverPluginType>();
