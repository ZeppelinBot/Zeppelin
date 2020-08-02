import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { PluginOptions } from "knub";
import { ConfigSchema, LogsPluginType } from "./types";
import DefaultLogMessages from "../../data/DefaultLogMessages.json";
import { GuildLogs } from "src/data/GuildLogs";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildArchives } from "src/data/GuildArchives";
import { GuildCases } from "src/data/GuildCases";
import { onMessageDelete } from "./util/onMessageDelete";
import { onMessageDeleteBulk } from "./util/onMessageDeleteBulk";
import { onMessageUpdate } from "./util/onMessageUpdate";
import { LogsGuildMemberAddEvt } from "./events/LogsGuildMemberAddEvt";
import { LogsGuildMemberRemoveEvt } from "./events/LogsGuildMemberRemoveEvt";
import { LogsGuildMemberUpdateEvt, LogsUserUpdateEvt } from "./events/LogsUserUpdateEvts";
import { LogsChannelCreateEvt, LogsChannelDeleteEvt } from "./events/LogsChannelModifyEvts";
import { LogsRoleCreateEvt, LogsRoleDeleteEvt } from "./events/LogsRoleModifyEvts";
import { LogsVoiceJoinEvt, LogsVoiceLeaveEvt, LogsVoiceSwitchEvt } from "./events/LogsVoiceChannelEvts";
import { log } from "./util/log";
import { LogType } from "../../data/LogType";
import { getLogMessage } from "./util/getLogMessage";

const defaultOptions: PluginOptions<LogsPluginType> = {
  config: {
    channels: {},
    format: {
      timestamp: "YYYY-MM-DD HH:mm:ss",
      ...DefaultLogMessages,
    },
    ping_user: true,
  },

  overrides: [
    {
      level: ">=50",
      config: {
        ping_user: false,
      },
    },
  ],
};

export const LogsPlugin = zeppelinPlugin<LogsPluginType>()("logs", {
  showInDocs: true,
  info: {
    prettyName: "Logs",
  },

  configSchema: ConfigSchema,
  defaultOptions,

  events: [
    LogsGuildMemberAddEvt,
    LogsGuildMemberRemoveEvt,
    LogsGuildMemberUpdateEvt,
    LogsUserUpdateEvt,
    LogsChannelCreateEvt,
    LogsChannelDeleteEvt,
    LogsRoleCreateEvt,
    LogsRoleDeleteEvt,
    LogsVoiceJoinEvt,
    LogsVoiceLeaveEvt,
    LogsVoiceSwitchEvt,
  ],

  public: {
    log(pluginData) {
      return (type: LogType, data: any) => {
        return log(pluginData, type, data);
      };
    },

    getLogMessage(pluginData) {
      return (type: LogType, data: any) => {
        return getLogMessage(pluginData, type, data);
      };
    },
  },

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.guildLogs = new GuildLogs(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.archives = GuildArchives.getGuildInstance(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);

    state.logListener = ({ type, data }) => log(pluginData, type, data);
    state.guildLogs.on("log", state.logListener);

    state.batches = new Map();

    state.onMessageDeleteFn = msg => onMessageDelete(pluginData, msg);
    state.savedMessages.events.on("delete", state.onMessageDeleteFn);

    state.onMessageDeleteBulkFn = msg => onMessageDeleteBulk(pluginData, msg);
    state.savedMessages.events.on("deleteBulk", state.onMessageDeleteBulkFn);

    state.onMessageUpdateFn = (newMsg, oldMsg) => onMessageUpdate(pluginData, newMsg, oldMsg);
    state.savedMessages.events.on("update", state.onMessageUpdateFn);
  },

  onUnload(pluginData) {
    pluginData.state.guildLogs.removeListener("log", pluginData.state.logListener);

    pluginData.state.savedMessages.events.off("delete", pluginData.state.onMessageDeleteFn);
    pluginData.state.savedMessages.events.off("deleteBulk", pluginData.state.onMessageDeleteBulkFn);
    pluginData.state.savedMessages.events.off("update", pluginData.state.onMessageUpdateFn);
  },
});
