import { PluginOptions } from "knub";
import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, PersistPluginType } from "./types";
import { GuildPersistedData } from "src/data/GuildPersistedData";
import { GuildLogs } from "src/data/GuildLogs";
import { StoreDataEvt } from "./events/StoreDataEvt";
import { LoadDataEvt } from "./events/LoadDataEvt";

const defaultOptions: PluginOptions<PersistPluginType> = {
  config: {
    persisted_roles: [],
    persist_nicknames: false,
    persist_voice_mutes: false,
  },
};

export const PersistPlugin = zeppelinPlugin<PersistPluginType>()("persist", {
  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  events: [
    StoreDataEvt,
    LoadDataEvt,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.persistedData = GuildPersistedData.getGuildInstance(guild.id);
    state.logs = new GuildLogs(guild.id);
  },
});
