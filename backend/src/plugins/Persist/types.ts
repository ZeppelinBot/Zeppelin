import * as t from "io-ts";
import { BasePluginType, guildEventListener } from "knub";
import { GuildPersistedData } from "../../data/GuildPersistedData";
import { GuildLogs } from "../../data/GuildLogs";

export const ConfigSchema = t.type({
  persisted_roles: t.array(t.string),
  persist_nicknames: t.boolean,
  persist_voice_mutes: t.boolean, // Deprecated, here to not break old configs
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface PersistPluginType extends BasePluginType {
  config: TConfigSchema;

  state: {
    persistedData: GuildPersistedData;
    logs: GuildLogs;
  };
}

export const persistEvt = guildEventListener<PersistPluginType>();
