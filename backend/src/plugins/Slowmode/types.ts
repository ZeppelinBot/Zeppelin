import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { GuildSlowmodes } from "../../data/GuildSlowmodes.js";
import { SlowmodeChannel } from "../../data/entities/SlowmodeChannel.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zSlowmodeConfig = z.strictObject({
  use_native_slowmode: z.boolean().default(true),

  can_manage: z.boolean().default(false),
  is_affected: z.boolean().default(true),
});

export interface SlowmodePluginType extends BasePluginType {
  configSchema: typeof zSlowmodeConfig;
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
