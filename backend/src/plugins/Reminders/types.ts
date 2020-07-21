import * as t from "io-ts";
import { BasePluginType, command } from "knub";
import { GuildReminders } from "src/data/GuildReminders";

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

export const remindersCommand = command<RemindersPluginType>();
