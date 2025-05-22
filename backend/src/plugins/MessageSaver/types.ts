import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "knub";
import z from "zod/v4";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zMessageSaverConfig = z.strictObject({
  can_manage: z.boolean(),
});

export interface MessageSaverPluginType extends BasePluginType {
  config: z.infer<typeof zMessageSaverConfig>;
  state: {
    savedMessages: GuildSavedMessages;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const messageSaverCmd = guildPluginMessageCommand<MessageSaverPluginType>();
export const messageSaverEvt = guildPluginEventListener<MessageSaverPluginType>();
