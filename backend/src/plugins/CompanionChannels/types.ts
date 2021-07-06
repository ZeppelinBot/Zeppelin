import * as t from "io-ts";
import { BasePluginType, CooldownManager, typedGuildEventListener } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { tNullable } from "../../utils";

// Permissions using these numbers: https://abal.moe/Eris/docs/reference (add all allowed/denied ones up)
export const CompanionChannelOpts = t.type({
  voice_channel_ids: t.array(t.string),
  text_channel_ids: t.array(t.string),
  permissions: t.number,
  enabled: tNullable(t.boolean),
});
export type TCompanionChannelOpts = t.TypeOf<typeof CompanionChannelOpts>;

export const ConfigSchema = t.type({
  entries: t.record(t.string, CompanionChannelOpts),
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface ICompanionChannelMap {
  [channelId: string]: TCompanionChannelOpts;
}

export interface CompanionChannelsPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    errorCooldownManager: CooldownManager;
    serverLogs: GuildLogs;
  };
}

export const companionChannelsEvt = typedGuildEventListener<CompanionChannelsPluginType>();
