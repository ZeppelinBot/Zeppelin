import { guildPlugin } from "vety";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin.js";
import { AutoDeletePluginType, zAutoDeleteConfig } from "./types.js";
import { onMessageCreate } from "./util/onMessageCreate.js";
import { onMessageDelete } from "./util/onMessageDelete.js";
import { onMessageDeleteBulk } from "./util/onMessageDeleteBulk.js";

export const AutoDeletePlugin = guildPlugin<AutoDeletePluginType>()({
  name: "auto_delete",

  dependencies: () => [TimeAndDatePlugin, LogsPlugin],
  configSchema: zAutoDeleteConfig,

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
    const { state } = pluginData;

    state.onMessageCreateFn = (msg) => onMessageCreate(pluginData, msg);
    state.guildSavedMessages.events.on("create", state.onMessageCreateFn);

    state.onMessageDeleteFn = (msg) => onMessageDelete(pluginData, msg);
    state.guildSavedMessages.events.on("delete", state.onMessageDeleteFn);

    state.onMessageDeleteBulkFn = (msgs) => onMessageDeleteBulk(pluginData, msgs);
    state.guildSavedMessages.events.on("deleteBulk", state.onMessageDeleteBulkFn);
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    state.guildSavedMessages.events.off("create", state.onMessageCreateFn);
    state.guildSavedMessages.events.off("delete", state.onMessageDeleteFn);
    state.guildSavedMessages.events.off("deleteBulk", state.onMessageDeleteBulkFn);
  },
});
