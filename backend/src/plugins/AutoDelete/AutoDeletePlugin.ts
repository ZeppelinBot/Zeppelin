import { PluginOptions } from "knub";
import { AutoDeletePluginType, ConfigSchema } from "./types";
import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildLogs } from "src/data/GuildLogs";
import { onMessageCreate } from "./util/onMessageCreate";
import { onMessageDelete } from "./util/onMessageDelete";
import { onMessageDeleteBulk } from "./util/onMessageDeleteBulk";

const defaultOptions: PluginOptions<AutoDeletePluginType> = {
  config: {
    enabled: false,
    delay: "5s",
  },
};

export const AutoDeletePlugin = zeppelinPlugin<AutoDeletePluginType>()("auto_delete", {
  configSchema: ConfigSchema,
  defaultOptions,

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.guildSavedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.guildLogs = new GuildLogs(guild.id);

    state.deletionQueue = [];
    state.nextDeletion = null;
    state.nextDeletionTimeout = null;

    state.maxDelayWarningSent = false;

    state.onMessageCreateFn = msg => onMessageCreate(pluginData, msg);
    state.guildSavedMessages.events.on("create", state.onMessageCreateFn);

    state.onMessageDeleteFn = msg => onMessageDelete(pluginData, msg);
    state.guildSavedMessages.events.on("delete", state.onMessageDeleteFn);

    state.onMessageDeleteBulkFn = msgs => onMessageDeleteBulk(pluginData, msgs);
    state.guildSavedMessages.events.on("deleteBulk", state.onMessageDeleteBulkFn);
  },

  onUnload(pluginData) {
    pluginData.state.guildSavedMessages.events.off("create", pluginData.state.onMessageCreateFn);
    pluginData.state.guildSavedMessages.events.off("delete", pluginData.state.onMessageDeleteFn);
    pluginData.state.guildSavedMessages.events.off("deleteBulk", pluginData.state.onMessageDeleteBulkFn);
  },
});
