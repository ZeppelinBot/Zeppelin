import { BasePluginType, guildPluginEventListener } from "knub";
import z from "zod";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildPersistedData } from "../../data/GuildPersistedData";
import { zSnowflake } from "../../utils";

export const zPersistConfig = z.strictObject({
  persisted_roles: z.array(zSnowflake),
  persist_nicknames: z.boolean(),
  persist_voice_mutes: z.boolean(),
});

export interface PersistPluginType extends BasePluginType {
  config: z.infer<typeof zPersistConfig>;

  state: {
    persistedData: GuildPersistedData;
    logs: GuildLogs;
  };
}

export const persistEvt = guildPluginEventListener<PersistPluginType>();
