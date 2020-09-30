import * as t from "io-ts";
import { BasePluginType, guildCommand } from "knub";
import { GuildReminders } from "../../data/GuildReminders";

export const ConfigSchema = t.type({
  can_use: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface RemindersPluginType extends BasePluginType {
  config: TConfigSchema;

  state: {
    reminders: GuildReminders;
    tries: Map<number, number>;

    postRemindersTimeout;
    unloaded: boolean;
  };
}

export const remindersCmd = guildCommand<RemindersPluginType>();
