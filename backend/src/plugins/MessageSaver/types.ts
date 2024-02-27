import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand } from "knub";
import z from "zod";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";

export const zMessageSaverConfig = z.strictObject({
  can_manage: z.boolean(),
});

export interface MessageSaverPluginType extends BasePluginType {
  config: z.infer<typeof zMessageSaverConfig>;
  state: {
    savedMessages: GuildSavedMessages;
  };
}

export const messageSaverCmd = guildPluginMessageCommand<MessageSaverPluginType>();
export const messageSaverEvt = guildPluginEventListener<MessageSaverPluginType>();
