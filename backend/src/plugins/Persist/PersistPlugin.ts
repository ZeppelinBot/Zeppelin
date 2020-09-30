import { PluginOptions } from "knub";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, PersistPluginType } from "./types";
import { GuildPersistedData } from "../../data/GuildPersistedData";
import { GuildLogs } from "../../data/GuildLogs";
import { StoreDataEvt } from "./events/StoreDataEvt";
import { LoadDataEvt } from "./events/LoadDataEvt";
import { trimPluginDescription } from "../../utils";
import { LogsPlugin } from "../Logs/LogsPlugin";

const defaultOptions: PluginOptions<PersistPluginType> = {
  config: {
    persisted_roles: [],
    persist_nicknames: false,
    persist_voice_mutes: false,
  },
};

export const PersistPlugin = zeppelinGuildPlugin<PersistPluginType>()("persist", {
  showInDocs: true,
  info: {
    prettyName: "Persist",
    description: trimPluginDescription(`
      Re-apply roles or nicknames for users when they rejoin the server.
      Mute roles are re-applied automatically, this plugin is not required for that.
    `),
  },

  dependencies: [LogsPlugin],
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
