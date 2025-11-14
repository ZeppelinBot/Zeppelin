import { BasePluginType, guildPluginEventListener } from "vety";
import { z } from "zod";
import { GuildLogs } from "../../data/GuildLogs.js";
import { zMessageContent } from "../../utils.js";

export const zWelcomeMessageConfig = z.strictObject({
  send_dm: z.boolean().default(false),
  send_to_channel: z.string().nullable().default(null),
  message: zMessageContent.nullable().default(null),
});

export interface WelcomeMessagePluginType extends BasePluginType {
  configSchema: typeof zWelcomeMessageConfig;
  state: {
    logs: GuildLogs;
    sentWelcomeMessages: Set<string>;
  };
}

export const welcomeMessageEvt = guildPluginEventListener<WelcomeMessagePluginType>();
