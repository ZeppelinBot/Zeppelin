import { PluginOptions } from "knub";
import DefaultLogMessages from "../../data/DefaultLogMessages.json";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { LogType } from "../../data/LogType";
import { logger } from "../../logger";
import { discardRegExpRunner, getRegExpRunner } from "../../regExpRunners";
import { disableCodeBlocks } from "../../utils";
import { CasesPlugin } from "../Cases/CasesPlugin";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { LogsChannelCreateEvt, LogsChannelDeleteEvt, LogsChannelUpdateEvt } from "./events/LogsChannelModifyEvts";
import { LogsGuildMemberAddEvt } from "./events/LogsGuildMemberAddEvt";
import { LogsGuildMemberRemoveEvt } from "./events/LogsGuildMemberRemoveEvt";
import { LogsRoleCreateEvt, LogsRoleDeleteEvt, LogsRoleUpdateEvt } from "./events/LogsRoleModifyEvts";
import {
  LogsStageInstanceCreateEvt,
  LogsStageInstanceDeleteEvt,
  LogsStageInstanceUpdateEvt,
} from "./events/LogsStageInstanceModifyEvts";
import { LogsThreadCreateEvt, LogsThreadDeleteEvt, LogsThreadUpdateEvt } from "./events/LogsThreadModifyEvts";
import { LogsGuildMemberUpdateEvt } from "./events/LogsUserUpdateEvts";
import { LogsVoiceStateUpdateEvt } from "./events/LogsVoiceChannelEvts";
import { ConfigSchema, FORMAT_NO_TIMESTAMP, LogsPluginType } from "./types";
import { getLogMessage } from "./util/getLogMessage";
import { log } from "./util/log";
import { onMessageDelete } from "./util/onMessageDelete";
import { onMessageDeleteBulk } from "./util/onMessageDeleteBulk";
import { onMessageUpdate } from "./util/onMessageUpdate";

const defaultOptions: PluginOptions<LogsPluginType> = {
  config: {
    channels: {},
    format: {
      timestamp: FORMAT_NO_TIMESTAMP, // Legacy/deprecated, use timestamp_format below instead
      ...DefaultLogMessages,
    },
    ping_user: true, // Legacy/deprecated, if below is false mentions wont actually ping. In case you really want the old behavior, set below to true
    allow_user_mentions: false,
    timestamp_format: "YYYY-MM-DD HH:mm:ss z",
    include_embed_timestamp: true,
  },

  overrides: [
    {
      level: ">=50",
      config: {
        ping_user: false, // Legacy/deprecated, read comment on global ping_user option
      },
    },
  ],
};

export const LogsPlugin = zeppelinGuildPlugin<LogsPluginType>()({
  name: "logs",
  showInDocs: true,
  info: {
    prettyName: "Logs",
  },

  dependencies: [TimeAndDatePlugin, CasesPlugin],
  configSchema: ConfigSchema,
  defaultOptions,

  events: [
    LogsGuildMemberAddEvt,
    LogsGuildMemberRemoveEvt,
    LogsGuildMemberUpdateEvt,
    LogsChannelCreateEvt,
    LogsChannelDeleteEvt,
    LogsChannelUpdateEvt,
    LogsRoleCreateEvt,
    LogsRoleDeleteEvt,
    LogsRoleUpdateEvt,
    LogsVoiceStateUpdateEvt,
    LogsStageInstanceCreateEvt,
    LogsStageInstanceDeleteEvt,
    LogsStageInstanceUpdateEvt,
    LogsThreadCreateEvt,
    LogsThreadDeleteEvt,
    LogsThreadUpdateEvt,
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

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.guildLogs = new GuildLogs(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.archives = GuildArchives.getGuildInstance(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);

    state.batches = new Map();

    state.regexRunner = getRegExpRunner(`guild-${pluginData.guild.id}`);
  },

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.logListener = ({ type, data }) => log(pluginData, type, data);
    state.guildLogs.on("log", state.logListener);

    state.onMessageDeleteFn = msg => onMessageDelete(pluginData, msg);
    state.savedMessages.events.on("delete", state.onMessageDeleteFn);

    state.onMessageDeleteBulkFn = msg => onMessageDeleteBulk(pluginData, msg);
    state.savedMessages.events.on("deleteBulk", state.onMessageDeleteBulkFn);

    state.onMessageUpdateFn = (newMsg, oldMsg) => onMessageUpdate(pluginData, newMsg, oldMsg);
    state.savedMessages.events.on("update", state.onMessageUpdateFn);

    state.regexRunnerRepeatedTimeoutListener = (regexSource, timeoutMs, failedTimes) => {
      logger.warn(`Disabled heavy regex temporarily: ${regexSource}`);
      log(pluginData, LogType.BOT_ALERT, {
        body:
          `
            The following regex has taken longer than ${timeoutMs}ms for ${failedTimes} times and has been temporarily disabled:
          `.trim() +
          "\n```" +
          disableCodeBlocks(regexSource) +
          "```",
      });
    };
    state.regexRunner.on("repeatedTimeout", state.regexRunnerRepeatedTimeoutListener);
  },

  beforeUnload(pluginData) {
    pluginData.state.guildLogs.removeListener("log", pluginData.state.logListener);

    pluginData.state.savedMessages.events.off("delete", pluginData.state.onMessageDeleteFn);
    pluginData.state.savedMessages.events.off("deleteBulk", pluginData.state.onMessageDeleteBulkFn);
    pluginData.state.savedMessages.events.off("update", pluginData.state.onMessageUpdateFn);

    pluginData.state.regexRunner.off("repeatedTimeout", pluginData.state.regexRunnerRepeatedTimeoutListener);
    discardRegExpRunner(`guild-${pluginData.guild.id}`);
  },
});
