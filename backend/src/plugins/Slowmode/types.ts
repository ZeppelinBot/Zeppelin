import * as t from "io-ts";
import { BasePluginType, eventListener, command } from "knub";
import { GuildSlowmodes } from "src/data/GuildSlowmodes";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildLogs } from "src/data/GuildLogs";

export const ConfigSchema = t.type({
  use_native_slowmode: t.boolean,

  can_manage: t.boolean,
  is_affected: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface SlowmodePluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    slowmodes: GuildSlowmodes;
    savedMessages: GuildSavedMessages;
    logs: GuildLogs;
    clearInterval: NodeJS.Timeout;

    onMessageCreateFn;
  };
}

export const slowmodeCmd = command<SlowmodePluginType>();
export const slowmodeEvt = eventListener<SlowmodePluginType>();
