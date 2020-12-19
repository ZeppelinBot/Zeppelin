import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { PluginOptions } from "knub";
import { ConfigSchema, FORMAT_NO_TIMESTAMP, LogsPluginType } from "./types";
import DefaultLogMessages from "../../data/DefaultLogMessages.json";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { onMessageDelete } from "./util/onMessageDelete";
import { onMessageDeleteBulk } from "./util/onMessageDeleteBulk";
import { onMessageUpdate } from "./util/onMessageUpdate";
import { LogsGuildMemberAddEvt } from "./events/LogsGuildMemberAddEvt";
import { LogsGuildMemberRemoveEvt } from "./events/LogsGuildMemberRemoveEvt";
import { LogsGuildMemberUpdateEvt } from "./events/LogsUserUpdateEvts";
import { LogsChannelCreateEvt, LogsChannelDeleteEvt } from "./events/LogsChannelModifyEvts";
import { LogsRoleCreateEvt, LogsRoleDeleteEvt } from "./events/LogsRoleModifyEvts";
import { LogsVoiceJoinEvt, LogsVoiceLeaveEvt, LogsVoiceSwitchEvt } from "./events/LogsVoiceChannelEvts";
import { log } from "./util/log";
import { LogType } from "../../data/LogType";
import { getLogMessage } from "./util/getLogMessage";
import { discardRegExpRunner, getRegExpRunner } from "../../regExpRunners";
import { disableCodeBlocks } from "../../utils";
import { logger } from "../../logger";
import { CasesPlugin } from "../Cases/CasesPlugin";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";

const defaultOptions: PluginOptions<LogsPluginType> = {
  config: {
    channels: {},
    format: {
      timestamp: FORMAT_NO_TIMESTAMP, // Legacy/deprecated, use timestamp_format below instead
      ...DefaultLogMessages,
    },
    ping_user: true,
    timestamp_format: "YYYY-MM-DD HH:mm:ss z",
    include_embed_timestamp: true,
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

export const LogsPlugin = zeppelinGuildPlugin<LogsPluginType>()("logs", {
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

    state.regexRunner = getRegExpRunner(`guild-${pluginData.guild.id}`);
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

  onUnload(pluginData) {
    pluginData.state.guildLogs.removeListener("log", pluginData.state.logListener);

    pluginData.state.savedMessages.events.off("delete", pluginData.state.onMessageDeleteFn);
    pluginData.state.savedMessages.events.off("deleteBulk", pluginData.state.onMessageDeleteBulkFn);
    pluginData.state.savedMessages.events.off("update", pluginData.state.onMessageUpdateFn);

    pluginData.state.regexRunner.off("repeatedTimeout", pluginData.state.regexRunnerRepeatedTimeoutListener);
    discardRegExpRunner(`guild-${pluginData.guild.id}`);
  },
});
