import { BasePluginType, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { GuildReminders } from "../../data/GuildReminders.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zRemindersConfig = z.strictObject({
  can_use: z.boolean().default(false),
});

export interface RemindersPluginType extends BasePluginType {
  configSchema: typeof zRemindersConfig;
  state: {
    reminders: GuildReminders;
    tries: Map<number, number>;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;

    unregisterGuildEventListener: () => void;

    unloaded: boolean;
  };
}

export const remindersCmd = guildPluginMessageCommand<RemindersPluginType>();
