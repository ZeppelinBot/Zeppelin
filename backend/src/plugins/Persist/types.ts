import { BasePluginType, guildPluginEventListener } from "vety";
import { z } from "zod";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildPersistedData } from "../../data/GuildPersistedData.js";
import { zSnowflake } from "../../utils.js";

export const zPersistConfig = z.strictObject({
  persisted_roles: z.array(zSnowflake).default([]),
  persist_nicknames: z.boolean().default(false),
  persist_voice_mutes: z.boolean().default(false),
});

export interface PersistPluginType extends BasePluginType {
  configSchema: typeof zPersistConfig;
  state: {
    persistedData: GuildPersistedData;
    logs: GuildLogs;
  };
}

export const persistEvt = guildPluginEventListener<PersistPluginType>();
