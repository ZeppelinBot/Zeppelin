import { BasePluginType, guildPluginMessageCommand, pluginUtils } from "knub";
import z from "zod";
import { GuildReminders } from "../../data/GuildReminders";
import { CommonPlugin } from "../Common/CommonPlugin";

export const zRemindersConfig = z.strictObject({
  can_use: z.boolean(),
});

export interface RemindersPluginType extends BasePluginType {
  config: z.infer<typeof zRemindersConfig>;

  state: {
    reminders: GuildReminders;
    tries: Map<number, number>;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;

    unregisterGuildEventListener: () => void;

    unloaded: boolean;
  };
}

export const remindersCmd = guildPluginMessageCommand<RemindersPluginType>();
