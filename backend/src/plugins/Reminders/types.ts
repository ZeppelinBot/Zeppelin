import * as t from "io-ts";
import { BasePluginType, typedGuildCommand } from "knub";
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

    unregisterGuildEventListener: () => void;

    unloaded: boolean;
  };
}

export const remindersCmd = typedGuildCommand<RemindersPluginType>();
