import { PluginOptions, guildPlugin } from "knub";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildPersistedData } from "../../data/GuildPersistedData.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { RoleManagerPlugin } from "../RoleManager/RoleManagerPlugin.js";
import { LoadDataEvt } from "./events/LoadDataEvt.js";
import { StoreDataEvt } from "./events/StoreDataEvt.js";
import { PersistPluginType, zPersistConfig } from "./types.js";

const defaultOptions: PluginOptions<PersistPluginType> = {
  config: {
    persisted_roles: [],
    persist_nicknames: false,
    persist_voice_mutes: false,
  },
};

export const PersistPlugin = guildPlugin<PersistPluginType>()({
  name: "persist",

  dependencies: () => [LogsPlugin, RoleManagerPlugin],
  configParser: (input) => zPersistConfig.parse(input),
  defaultOptions,

  // prettier-ignore
  events: [
    StoreDataEvt,
    LoadDataEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.persistedData = GuildPersistedData.getGuildInstance(guild.id);
    state.logs = new GuildLogs(guild.id);
  },
});
