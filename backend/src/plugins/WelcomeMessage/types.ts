import { BasePluginType, guildPluginEventListener } from "knub";
import { z } from "zod";
import { GuildLogs } from "../../data/GuildLogs.js";

export const zWelcomeMessageConfig = z.strictObject({
  send_dm: z.boolean().default(false),
  send_to_channel: z.string().nullable().default(null),
  message: z.string().nullable().default(null),
});

export interface WelcomeMessagePluginType extends BasePluginType {
  configSchema: typeof zWelcomeMessageConfig;
  state: {
    logs: GuildLogs;
    sentWelcomeMessages: Set<string>;
  };
}

export const welcomeMessageEvt = guildPluginEventListener<WelcomeMessagePluginType>();
