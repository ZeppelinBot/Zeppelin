import { CooldownManager, PluginOptions, guildPlugin } from "knub";
import DefaultLogMessages from "../../data/DefaultLogMessages.json";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { LogType } from "../../data/LogType";
import { logger } from "../../logger";
import { makePublicFn } from "../../pluginUtils";
import { discardRegExpRunner, getRegExpRunner } from "../../regExpRunners";
import { createTypedTemplateSafeValueContainer } from "../../templateFormatter";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
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
import { FORMAT_NO_TIMESTAMP, LogsPluginType, zLogsConfig } from "./types";
import { getLogMessage } from "./util/getLogMessage";
import { log } from "./util/log";
import { onMessageDelete } from "./util/onMessageDelete";
import { onMessageDeleteBulk } from "./util/onMessageDeleteBulk";
import { onMessageUpdate } from "./util/onMessageUpdate";

import { escapeCodeBlock } from "discord.js";
import { InternalPosterPlugin } from "../InternalPoster/InternalPosterPlugin";
import { LogsGuildMemberRoleChangeEvt } from "./events/LogsGuildMemberRoleChangeEvt";
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
    format: DefaultLogMessages,
    ping_user: true,
    allow_user_mentions: false,
    timestamp_format: "[<t:]X[>]",
    include_embed_timestamp: true,
  },

  overrides: [
    {
      level: ">=50",
      config: {
        // Legacy/deprecated, read comment on global ping_user option
        ping_user: false,
      },
    },
  ],
};

export const LogsPlugin = guildPlugin<LogsPluginType>()({
  name: "logs",

  dependencies: async () => [TimeAndDatePlugin, InternalPosterPlugin, (await getCasesPlugin()).CasesPlugin],
  configParser: (input) => zLogsConfig.parse(input),
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
    LogsGuildMemberRoleChangeEvt,
  ],

  public(pluginData) {
    return {
      getLogMessage: makePublicFn(pluginData, getLogMessage),
      logAutomodAction: makePublicFn(pluginData, logAutomodAction),
      logBotAlert: makePublicFn(pluginData, logBotAlert),
      logCaseCreate: makePublicFn(pluginData, logCaseCreate),
      logCaseDelete: makePublicFn(pluginData, logCaseDelete),
      logCaseUpdate: makePublicFn(pluginData, logCaseUpdate),
      logCensor: makePublicFn(pluginData, logCensor),
      logChannelCreate: makePublicFn(pluginData, logChannelCreate),
      logChannelDelete: makePublicFn(pluginData, logChannelDelete),
      logChannelUpdate: makePublicFn(pluginData, logChannelUpdate),
      logClean: makePublicFn(pluginData, logClean),
      logEmojiCreate: makePublicFn(pluginData, logEmojiCreate),
      logEmojiDelete: makePublicFn(pluginData, logEmojiDelete),
      logEmojiUpdate: makePublicFn(pluginData, logEmojiUpdate),
      logMassBan: makePublicFn(pluginData, logMassBan),
      logMassMute: makePublicFn(pluginData, logMassMute),
      logMassUnban: makePublicFn(pluginData, logMassUnban),
      logMemberBan: makePublicFn(pluginData, logMemberBan),
      logMemberForceban: makePublicFn(pluginData, logMemberForceban),
      logMemberJoin: makePublicFn(pluginData, logMemberJoin),
      logMemberJoinWithPriorRecords: makePublicFn(pluginData, logMemberJoinWithPriorRecords),
      logMemberKick: makePublicFn(pluginData, logMemberKick),
      logMemberLeave: makePublicFn(pluginData, logMemberLeave),
      logMemberMute: makePublicFn(pluginData, logMemberMute),
      logMemberMuteExpired: makePublicFn(pluginData, logMemberMuteExpired),
      logMemberMuteRejoin: makePublicFn(pluginData, logMemberMuteRejoin),
      logMemberNickChange: makePublicFn(pluginData, logMemberNickChange),
      logMemberNote: makePublicFn(pluginData, logMemberNote),
      logMemberRestore: makePublicFn(pluginData, logMemberRestore),
      logMemberRoleAdd: makePublicFn(pluginData, logMemberRoleAdd),
      logMemberRoleChanges: makePublicFn(pluginData, logMemberRoleChanges),
      logMemberRoleRemove: makePublicFn(pluginData, logMemberRoleRemove),
      logMemberTimedBan: makePublicFn(pluginData, logMemberTimedBan),
      logMemberTimedMute: makePublicFn(pluginData, logMemberTimedMute),
      logMemberTimedUnban: makePublicFn(pluginData, logMemberTimedUnban),
      logMemberTimedUnmute: makePublicFn(pluginData, logMemberTimedUnmute),
      logMemberUnban: makePublicFn(pluginData, logMemberUnban),
      logMemberUnmute: makePublicFn(pluginData, logMemberUnmute),
      logMemberWarn: makePublicFn(pluginData, logMemberWarn),
      logMessageDelete: makePublicFn(pluginData, logMessageDelete),
      logMessageDeleteAuto: makePublicFn(pluginData, logMessageDeleteAuto),
      logMessageDeleteBare: makePublicFn(pluginData, logMessageDeleteBare),
      logMessageDeleteBulk: makePublicFn(pluginData, logMessageDeleteBulk),
      logMessageEdit: makePublicFn(pluginData, logMessageEdit),
      logMessageSpamDetected: makePublicFn(pluginData, logMessageSpamDetected),
      logOtherSpamDetected: makePublicFn(pluginData, logOtherSpamDetected),
      logPostedScheduledMessage: makePublicFn(pluginData, logPostedScheduledMessage),
      logRepeatedMessage: makePublicFn(pluginData, logRepeatedMessage),
      logRoleCreate: makePublicFn(pluginData, logRoleCreate),
      logRoleDelete: makePublicFn(pluginData, logRoleDelete),
      logRoleUpdate: makePublicFn(pluginData, logRoleUpdate),
      logScheduledMessage: makePublicFn(pluginData, logScheduledMessage),
      logScheduledRepeatedMessage: makePublicFn(pluginData, logScheduledRepeatedMessage),
      logSetAntiraidAuto: makePublicFn(pluginData, logSetAntiraidAuto),
      logSetAntiraidUser: makePublicFn(pluginData, logSetAntiraidUser),
      logStageInstanceCreate: makePublicFn(pluginData, logStageInstanceCreate),
      logStageInstanceDelete: makePublicFn(pluginData, logStageInstanceDelete),
      logStageInstanceUpdate: makePublicFn(pluginData, logStageInstanceUpdate),
      logStickerCreate: makePublicFn(pluginData, logStickerCreate),
      logStickerDelete: makePublicFn(pluginData, logStickerDelete),
      logStickerUpdate: makePublicFn(pluginData, logStickerUpdate),
      logThreadCreate: makePublicFn(pluginData, logThreadCreate),
      logThreadDelete: makePublicFn(pluginData, logThreadDelete),
      logThreadUpdate: makePublicFn(pluginData, logThreadUpdate),
      logVoiceChannelForceDisconnect: makePublicFn(pluginData, logVoiceChannelForceDisconnect),
      logVoiceChannelForceMove: makePublicFn(pluginData, logVoiceChannelForceMove),
      logVoiceChannelJoin: makePublicFn(pluginData, logVoiceChannelJoin),
      logVoiceChannelLeave: makePublicFn(pluginData, logVoiceChannelLeave),
      logVoiceChannelMove: makePublicFn(pluginData, logVoiceChannelMove),
      logDmFailed: makePublicFn(pluginData, logDmFailed),
    };
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
