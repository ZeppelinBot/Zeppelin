import { BasePluginType, CooldownManager, guildPluginEventListener } from "knub";
import z from "zod";
import { GuildLogs } from "../../data/GuildLogs";
import { zBoundedCharacters, zSnowflake } from "../../utils";

export const zCompanionChannelOpts = z.strictObject({
  voice_channel_ids: z.array(zSnowflake),
  text_channel_ids: z.array(zSnowflake),
  // See https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags
  permissions: z.number(),
  enabled: z.boolean().nullable().default(true),
});
export type TCompanionChannelOpts = z.infer<typeof zCompanionChannelOpts>;

export const zCompanionChannelsConfig = z.strictObject({
  entries: z.record(zBoundedCharacters(0, 100), zCompanionChannelOpts),
});

export interface CompanionChannelsPluginType extends BasePluginType {
  config: z.infer<typeof zCompanionChannelsConfig>;
  state: {
    errorCooldownManager: CooldownManager;
    serverLogs: GuildLogs;
  };
}

export const companionChannelsEvt = guildPluginEventListener<CompanionChannelsPluginType>();
