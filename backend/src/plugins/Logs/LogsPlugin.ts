import { CooldownManager, PluginOptions } from "knub";
import DefaultLogMessages from "../../data/DefaultLogMessages.json";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { LogType } from "../../data/LogType";
import { logger } from "../../logger";
import { makeIoTsConfigParser, mapToPublicFn } from "../../pluginUtils";
import { discardRegExpRunner, getRegExpRunner } from "../../regExpRunners";
import { createTypedTemplateSafeValueContainer, TypedTemplateSafeValueContainer } from "../../templateFormatter";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { LogsChannelCreateEvt, LogsChannelDeleteEvt, LogsChannelUpdateEvt } from "./events/LogsChannelModifyEvts";
import {
  LogsEmojiCreateEvt,
  LogsEmojiDeleteEvt,
  LogsEmojiUpdateEvt,
  LogsStickerCreateEvt,
  LogsStickerDeleteEvt,
  LogsStickerUpdateEvt,
} from "./events/LogsEmojiAndStickerModifyEvts";
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
import { ConfigSchema, FORMAT_NO_TIMESTAMP, ILogTypeData, LogsPluginType, TLogChannel } from "./types";
import { getLogMessage } from "./util/getLogMessage";
import { log } from "./util/log";
import { onMessageDelete } from "./util/onMessageDelete";
import { onMessageDeleteBulk } from "./util/onMessageDeleteBulk";
import { onMessageUpdate } from "./util/onMessageUpdate";

import { escapeCodeBlock } from "discord.js";
import { InternalPosterPlugin } from "../InternalPoster/InternalPosterPlugin";
import { logAutomodAction } from "./logFunctions/logAutomodAction";
import { logBotAlert } from "./logFunctions/logBotAlert";
import { logCaseCreate } from "./logFunctions/logCaseCreate";
import { logCaseDelete } from "./logFunctions/logCaseDelete";
import { logCaseUpdate } from "./logFunctions/logCaseUpdate";
import { logCensor } from "./logFunctions/logCensor";
import { logChannelCreate } from "./logFunctions/logChannelCreate";
import { logChannelDelete } from "./logFunctions/logChannelDelete";
import { logChannelUpdate } from "./logFunctions/logChannelUpdate";
import { logClean } from "./logFunctions/logClean";
import { logDmFailed } from "./logFunctions/logDmFailed";
import { logEmojiCreate } from "./logFunctions/logEmojiCreate";
import { logEmojiDelete } from "./logFunctions/logEmojiDelete";
import { logEmojiUpdate } from "./logFunctions/logEmojiUpdate";
import { logMassBan } from "./logFunctions/logMassBan";
import { logMassMute } from "./logFunctions/logMassMute";
import { logMassUnban } from "./logFunctions/logMassUnban";
import { logMemberBan } from "./logFunctions/logMemberBan";
import { logMemberForceban } from "./logFunctions/logMemberForceban";
import { logMemberJoin } from "./logFunctions/logMemberJoin";
import { logMemberJoinWithPriorRecords } from "./logFunctions/logMemberJoinWithPriorRecords";
import { logMemberKick } from "./logFunctions/logMemberKick";
import { logMemberLeave } from "./logFunctions/logMemberLeave";
import { logMemberMute } from "./logFunctions/logMemberMute";
import { logMemberMuteExpired } from "./logFunctions/logMemberMuteExpired";
import { logMemberMuteRejoin } from "./logFunctions/logMemberMuteRejoin";
import { logMemberNickChange } from "./logFunctions/logMemberNickChange";
import { logMemberNote } from "./logFunctions/logMemberNote";
import { logMemberRestore } from "./logFunctions/logMemberRestore";
import { logMemberRoleAdd } from "./logFunctions/logMemberRoleAdd";
import { logMemberRoleChanges } from "./logFunctions/logMemberRoleChanges";
import { logMemberRoleRemove } from "./logFunctions/logMemberRoleRemove";
import { logMemberTimedBan } from "./logFunctions/logMemberTimedBan";
import { logMemberTimedMute } from "./logFunctions/logMemberTimedMute";
import { logMemberTimedUnban } from "./logFunctions/logMemberTimedUnban";
import { logMemberTimedUnmute } from "./logFunctions/logMemberTimedUnmute";
import { logMemberUnban } from "./logFunctions/logMemberUnban";
import { logMemberUnmute } from "./logFunctions/logMemberUnmute";
import { logMemberWarn } from "./logFunctions/logMemberWarn";
import { logMessageDelete } from "./logFunctions/logMessageDelete";
import { logMessageDeleteAuto } from "./logFunctions/logMessageDeleteAuto";
import { logMessageDeleteBare } from "./logFunctions/logMessageDeleteBare";
import { logMessageDeleteBulk } from "./logFunctions/logMessageDeleteBulk";
import { logMessageEdit } from "./logFunctions/logMessageEdit";
import { logMessageSpamDetected } from "./logFunctions/logMessageSpamDetected";
import { logOtherSpamDetected } from "./logFunctions/logOtherSpamDetected";
import { logPostedScheduledMessage } from "./logFunctions/logPostedScheduledMessage";
import { logRepeatedMessage } from "./logFunctions/logRepeatedMessage";
import { logRoleCreate } from "./logFunctions/logRoleCreate";
import { logRoleDelete } from "./logFunctions/logRoleDelete";
import { logRoleUpdate } from "./logFunctions/logRoleUpdate";
import { logScheduledMessage } from "./logFunctions/logScheduledMessage";
import { logScheduledRepeatedMessage } from "./logFunctions/logScheduledRepeatedMessage";
import { logSetAntiraidAuto } from "./logFunctions/logSetAntiraidAuto";
import { logSetAntiraidUser } from "./logFunctions/logSetAntiraidUser";
import { logStageInstanceCreate } from "./logFunctions/logStageInstanceCreate";
import { logStageInstanceDelete } from "./logFunctions/logStageInstanceDelete";
import { logStageInstanceUpdate } from "./logFunctions/logStageInstanceUpdate";
import { logStickerCreate } from "./logFunctions/logStickerCreate";
import { logStickerDelete } from "./logFunctions/logStickerDelete";
import { logStickerUpdate } from "./logFunctions/logStickerUpdate";
import { logThreadCreate } from "./logFunctions/logThreadCreate";
import { logThreadDelete } from "./logFunctions/logThreadDelete";
import { logThreadUpdate } from "./logFunctions/logThreadUpdate";
import { logVoiceChannelForceDisconnect } from "./logFunctions/logVoiceChannelForceDisconnect";
import { logVoiceChannelForceMove } from "./logFunctions/logVoiceChannelForceMove";
import { logVoiceChannelJoin } from "./logFunctions/logVoiceChannelJoin";
import { logVoiceChannelLeave } from "./logFunctions/logVoiceChannelLeave";
import { logVoiceChannelMove } from "./logFunctions/logVoiceChannelMove";

// The `any` cast here is to prevent TypeScript from locking up from the circular dependency
function getCasesPlugin(): Promise<any> {
  return import("../Cases/CasesPlugin.js") as Promise<any>;
}

const defaultOptions: PluginOptions<LogsPluginType> = {
  config: {
    channels: {},
    format: {
      timestamp: FORMAT_NO_TIMESTAMP, // Legacy/deprecated, use timestamp_format below instead
      ...DefaultLogMessages,
    },
    ping_user: true, // Legacy/deprecated, if below is false mentions wont actually ping. In case you really want the old behavior, set below to true
    allow_user_mentions: false,
    timestamp_format: "[<t:]X[>]",
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
    configSchema: ConfigSchema,
  },

  dependencies: async () => [TimeAndDatePlugin, InternalPosterPlugin, (await getCasesPlugin()).CasesPlugin],
  configParser: makeIoTsConfigParser(ConfigSchema),
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
    LogsEmojiCreateEvt,
    LogsEmojiDeleteEvt,
    LogsEmojiUpdateEvt,
    LogsStickerCreateEvt,
    LogsStickerDeleteEvt,
    LogsStickerUpdateEvt,
  ],

  public: {
    getLogMessage: (pluginData) => {
      return <TLogType extends keyof ILogTypeData>(
        type: TLogType,
        data: TypedTemplateSafeValueContainer<ILogTypeData[TLogType]>,
        opts?: Pick<TLogChannel, "format" | "timestamp_format" | "include_embed_timestamp">,
      ) => {
        return getLogMessage(pluginData, type, data, opts);
      };
    },

    logAutomodAction: mapToPublicFn(logAutomodAction),
    logBotAlert: mapToPublicFn(logBotAlert),
    logCaseCreate: mapToPublicFn(logCaseCreate),
    logCaseDelete: mapToPublicFn(logCaseDelete),
    logCaseUpdate: mapToPublicFn(logCaseUpdate),
    logCensor: mapToPublicFn(logCensor),
    logChannelCreate: mapToPublicFn(logChannelCreate),
    logChannelDelete: mapToPublicFn(logChannelDelete),
    logChannelUpdate: mapToPublicFn(logChannelUpdate),
    logClean: mapToPublicFn(logClean),
    logEmojiCreate: mapToPublicFn(logEmojiCreate),
    logEmojiDelete: mapToPublicFn(logEmojiDelete),
    logEmojiUpdate: mapToPublicFn(logEmojiUpdate),
    logMassBan: mapToPublicFn(logMassBan),
    logMassMute: mapToPublicFn(logMassMute),
    logMassUnban: mapToPublicFn(logMassUnban),
    logMemberBan: mapToPublicFn(logMemberBan),
    logMemberForceban: mapToPublicFn(logMemberForceban),
    logMemberJoin: mapToPublicFn(logMemberJoin),
    logMemberJoinWithPriorRecords: mapToPublicFn(logMemberJoinWithPriorRecords),
    logMemberKick: mapToPublicFn(logMemberKick),
    logMemberLeave: mapToPublicFn(logMemberLeave),
    logMemberMute: mapToPublicFn(logMemberMute),
    logMemberMuteExpired: mapToPublicFn(logMemberMuteExpired),
    logMemberMuteRejoin: mapToPublicFn(logMemberMuteRejoin),
    logMemberNickChange: mapToPublicFn(logMemberNickChange),
    logMemberNote: mapToPublicFn(logMemberNote),
    logMemberRestore: mapToPublicFn(logMemberRestore),
    logMemberRoleAdd: mapToPublicFn(logMemberRoleAdd),
    logMemberRoleChanges: mapToPublicFn(logMemberRoleChanges),
    logMemberRoleRemove: mapToPublicFn(logMemberRoleRemove),
    logMemberTimedBan: mapToPublicFn(logMemberTimedBan),
    logMemberTimedMute: mapToPublicFn(logMemberTimedMute),
    logMemberTimedUnban: mapToPublicFn(logMemberTimedUnban),
    logMemberTimedUnmute: mapToPublicFn(logMemberTimedUnmute),
    logMemberUnban: mapToPublicFn(logMemberUnban),
    logMemberUnmute: mapToPublicFn(logMemberUnmute),
    logMemberWarn: mapToPublicFn(logMemberWarn),
    logMessageDelete: mapToPublicFn(logMessageDelete),
    logMessageDeleteAuto: mapToPublicFn(logMessageDeleteAuto),
    logMessageDeleteBare: mapToPublicFn(logMessageDeleteBare),
    logMessageDeleteBulk: mapToPublicFn(logMessageDeleteBulk),
    logMessageEdit: mapToPublicFn(logMessageEdit),
    logMessageSpamDetected: mapToPublicFn(logMessageSpamDetected),
    logOtherSpamDetected: mapToPublicFn(logOtherSpamDetected),
    logPostedScheduledMessage: mapToPublicFn(logPostedScheduledMessage),
    logRepeatedMessage: mapToPublicFn(logRepeatedMessage),
    logRoleCreate: mapToPublicFn(logRoleCreate),
    logRoleDelete: mapToPublicFn(logRoleDelete),
    logRoleUpdate: mapToPublicFn(logRoleUpdate),
    logScheduledMessage: mapToPublicFn(logScheduledMessage),
    logScheduledRepeatedMessage: mapToPublicFn(logScheduledRepeatedMessage),
    logSetAntiraidAuto: mapToPublicFn(logSetAntiraidAuto),
    logSetAntiraidUser: mapToPublicFn(logSetAntiraidUser),
    logStageInstanceCreate: mapToPublicFn(logStageInstanceCreate),
    logStageInstanceDelete: mapToPublicFn(logStageInstanceDelete),
    logStageInstanceUpdate: mapToPublicFn(logStageInstanceUpdate),
    logStickerCreate: mapToPublicFn(logStickerCreate),
    logStickerDelete: mapToPublicFn(logStickerDelete),
    logStickerUpdate: mapToPublicFn(logStickerUpdate),
    logThreadCreate: mapToPublicFn(logThreadCreate),
    logThreadDelete: mapToPublicFn(logThreadDelete),
    logThreadUpdate: mapToPublicFn(logThreadUpdate),
    logVoiceChannelForceDisconnect: mapToPublicFn(logVoiceChannelForceDisconnect),
    logVoiceChannelForceMove: mapToPublicFn(logVoiceChannelForceMove),
    logVoiceChannelJoin: mapToPublicFn(logVoiceChannelJoin),
    logVoiceChannelLeave: mapToPublicFn(logVoiceChannelLeave),
    logVoiceChannelMove: mapToPublicFn(logVoiceChannelMove),
    logDmFailed: mapToPublicFn(logDmFailed),
  },

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.guildLogs = new GuildLogs(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.archives = GuildArchives.getGuildInstance(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);

    state.buffers = new Map();
    state.channelCooldowns = new CooldownManager();

    state.regexRunner = getRegExpRunner(`guild-${pluginData.guild.id}`);
  },

  afterLoad(pluginData) {
    const { state } = pluginData;

    state.logListener = ({ type, data }) => log(pluginData, type, data);
    state.guildLogs.on("log", state.logListener);

    state.onMessageDeleteFn = (msg) => onMessageDelete(pluginData, msg);
    state.savedMessages.events.on("delete", state.onMessageDeleteFn);

    state.onMessageDeleteBulkFn = (msg) => onMessageDeleteBulk(pluginData, msg);
    state.savedMessages.events.on("deleteBulk", state.onMessageDeleteBulkFn);

    state.onMessageUpdateFn = (newMsg, oldMsg) => onMessageUpdate(pluginData, newMsg, oldMsg);
    state.savedMessages.events.on("update", state.onMessageUpdateFn);

    state.regexRunnerRepeatedTimeoutListener = (regexSource, timeoutMs, failedTimes) => {
      logger.warn(`Disabled heavy regex temporarily: ${regexSource}`);
      log(
        pluginData,
        LogType.BOT_ALERT,
        createTypedTemplateSafeValueContainer({
          body:
            `
            The following regex has taken longer than ${timeoutMs}ms for ${failedTimes} times and has been temporarily disabled:
          `.trim() +
            "\n```" +
            escapeCodeBlock(regexSource) +
            "```",
        }),
      );
    };
    state.regexRunner.on("repeatedTimeout", state.regexRunnerRepeatedTimeoutListener);
  },

  beforeUnload(pluginData) {
    const { state, guild } = pluginData;

    if (state.logListener) {
      state.guildLogs.removeListener("log", state.logListener);
    }

    if (state.onMessageDeleteFn) {
      state.savedMessages.events.off("delete", state.onMessageDeleteFn);
    }
    if (state.onMessageDeleteBulkFn) {
      state.savedMessages.events.off("deleteBulk", state.onMessageDeleteBulkFn);
    }
    if (state.onMessageUpdateFn) {
      state.savedMessages.events.off("update", state.onMessageUpdateFn);
    }

    if (state.regexRunnerRepeatedTimeoutListener) {
      state.regexRunner.off("repeatedTimeout", state.regexRunnerRepeatedTimeoutListener);
    }
    discardRegExpRunner(`guild-${guild.id}`);
  },
});
