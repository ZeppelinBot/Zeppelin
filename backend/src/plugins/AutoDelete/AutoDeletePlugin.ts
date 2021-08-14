import { PluginOptions } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { AutoDeletePluginType, ConfigSchema } from "./types";
import { onMessageCreate } from "./util/onMessageCreate";
import { onMessageDelete } from "./util/onMessageDelete";
import { onMessageDeleteBulk } from "./util/onMessageDeleteBulk";

const defaultOptions: PluginOptions<AutoDeletePluginType> = {
  config: {
    enabled: false,
    delay: "5s",
  },
};

export const AutoDeletePlugin = zeppelinGuildPlugin<AutoDeletePluginType>()({
  name: "auto_delete",
  showInDocs: true,
  info: {
    prettyName: "Auto-delete",
    description: "Allows Zeppelin to auto-delete messages from a channel after a delay",
    configurationGuide: "Maximum deletion delay is currently 5 minutes",
  },

  dependencies: [TimeAndDatePlugin, LogsPlugin],
  configSchema: ConfigSchema,
  defaultOptions,

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.guildSavedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.guildLogs = new GuildLogs(guild.id);

    state.deletionQueue = [];
    state.nextDeletion = null;
    state.nextDeletionTimeout = null;

    state.maxDelayWarningSent = false;
  },

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.onMessageCreateFn = msg => onMessageCreate(pluginData, msg);
    state.guildSavedMessages.events.on("create", state.onMessageCreateFn);

    state.onMessageDeleteFn = msg => onMessageDelete(pluginData, msg);
    state.guildSavedMessages.events.on("delete", state.onMessageDeleteFn);

    state.onMessageDeleteBulkFn = msgs => onMessageDeleteBulk(pluginData, msgs);
    state.guildSavedMessages.events.on("deleteBulk", state.onMessageDeleteBulkFn);
  },

  beforeUnload(pluginData) {
    pluginData.state.guildSavedMessages.events.off("create", pluginData.state.onMessageCreateFn);
    pluginData.state.guildSavedMessages.events.off("delete", pluginData.state.onMessageDeleteFn);
    pluginData.state.guildSavedMessages.events.off("deleteBulk", pluginData.state.onMessageDeleteBulkFn);
  },
});
