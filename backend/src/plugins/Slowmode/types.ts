import * as t from "io-ts";
import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand } from "knub";
import { SlowmodeChannel } from "../../data/entities/SlowmodeChannel";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildSlowmodes } from "../../data/GuildSlowmodes";

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
    serverLogs: GuildLogs;
    channelSlowmodeCache: Map<string, SlowmodeChannel | null>;

    onMessageCreateFn;
  };
}

export const slowmodeCmd = guildPluginMessageCommand<SlowmodePluginType>();
export const slowmodeEvt = guildPluginEventListener<SlowmodePluginType>();
