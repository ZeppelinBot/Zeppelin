import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "knub";
import z from "zod";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildSlowmodes } from "../../data/GuildSlowmodes";
import { SlowmodeChannel } from "../../data/entities/SlowmodeChannel";
import { CommonPlugin } from "../Common/CommonPlugin";

export const zSlowmodeConfig = z.strictObject({
  use_native_slowmode: z.boolean(),

  can_manage: z.boolean(),
  is_affected: z.boolean(),
});

export interface SlowmodePluginType extends BasePluginType {
  config: z.infer<typeof zSlowmodeConfig>;
  state: {
    slowmodes: GuildSlowmodes;
    savedMessages: GuildSavedMessages;
    logs: GuildLogs;
    clearInterval: NodeJS.Timeout;
    serverLogs: GuildLogs;
    channelSlowmodeCache: Map<string, SlowmodeChannel | null>;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;

    onMessageCreateFn;
  };
}

export const slowmodeCmd = guildPluginMessageCommand<SlowmodePluginType>();
export const slowmodeEvt = guildPluginEventListener<SlowmodePluginType>();
