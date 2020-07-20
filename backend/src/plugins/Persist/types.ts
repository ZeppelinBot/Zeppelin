import * as t from "io-ts";
import { BasePluginType, eventListener } from "knub";
import { GuildPersistedData } from "src/data/GuildPersistedData";
import { GuildLogs } from "src/data/GuildLogs";

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

export const persistEvent = eventListener<PersistPluginType>();
