import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "knub";
import z from "zod";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { CommonPlugin } from "../Common/CommonPlugin";

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
