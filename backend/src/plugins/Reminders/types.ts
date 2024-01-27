import { BasePluginType, guildPluginMessageCommand } from "knub";
import z from "zod";
import { GuildReminders } from "../../data/GuildReminders";

export const zRemindersConfig = z.strictObject({
  can_use: z.boolean(),
});

export interface RemindersPluginType extends BasePluginType {
  config: z.infer<typeof zRemindersConfig>;

  state: {
    reminders: GuildReminders;
    tries: Map<number, number>;

    unregisterGuildEventListener: () => void;

    unloaded: boolean;
  };
}

export const remindersCmd = guildPluginMessageCommand<RemindersPluginType>();
