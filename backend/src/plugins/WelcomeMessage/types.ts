import { BasePluginType, guildPluginEventListener } from "knub";
import z from "zod";
import { GuildLogs } from "../../data/GuildLogs";

export const zWelcomeMessageConfig = z.strictObject({
  send_dm: z.boolean(),
  send_to_channel: z.string().nullable(),
  message: z.string().nullable(),
});

export interface WelcomeMessagePluginType extends BasePluginType {
  config: z.infer<typeof zWelcomeMessageConfig>;
  state: {
    logs: GuildLogs;
    sentWelcomeMessages: Set<string>;
  };
}

export const welcomeMessageEvt = guildPluginEventListener<WelcomeMessagePluginType>();
