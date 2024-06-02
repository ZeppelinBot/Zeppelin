import { CooldownManager, PluginOptions, guildPlugin } from "knub";
import DefaultLogMessages from "../../data/DefaultLogMessages.json" assert { type: "json" };
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildCases } from "../../data/GuildCases.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { LogType } from "../../data/LogType.js";
import { logger } from "../../logger.js";
import { makePublicFn } from "../../pluginUtils.js";
import { discardRegExpRunner, getRegExpRunner } from "../../regExpRunners.js";
import { createTypedTemplateSafeValueContainer } from "../../templateFormatter.js";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin.js";
import { LogsChannelCreateEvt, LogsChannelDeleteEvt, LogsChannelUpdateEvt } from "./events/LogsChannelModifyEvts.js";
import {
  LogsEmojiCreateEvt,
  LogsEmojiDeleteEvt,
  LogsEmojiUpdateEvt,
  LogsStickerCreateEvt,
  LogsStickerDeleteEvt,
  LogsStickerUpdateEvt,
} from "./events/LogsEmojiAndStickerModifyEvts.js";
import { LogsGuildMemberAddEvt } from "./events/LogsGuildMemberAddEvt.js";
import { LogsGuildMemberRemoveEvt } from "./events/LogsGuildMemberRemoveEvt.js";
import { LogsRoleCreateEvt, LogsRoleDeleteEvt, LogsRoleUpdateEvt } from "./events/LogsRoleModifyEvts.js";
import {
  LogsStageInstanceCreateEvt,
  LogsStageInstanceDeleteEvt,
  LogsStageInstanceUpdateEvt,
} from "./events/LogsStageInstanceModifyEvts.js";
import { LogsThreadCreateEvt, LogsThreadDeleteEvt, LogsThreadUpdateEvt } from "./events/LogsThreadModifyEvts.js";
import { LogsGuildMemberUpdateEvt } from "./events/LogsUserUpdateEvts.js";
import { LogsVoiceStateUpdateEvt } from "./events/LogsVoiceChannelEvts.js";
import { LogsPluginType, zLogsConfig } from "./types.js";
import { getLogMessage } from "./util/getLogMessage.js";
import { log } from "./util/log.js";
import { onMessageDelete } from "./util/onMessageDelete.js";
import { onMessageDeleteBulk } from "./util/onMessageDeleteBulk.js";
import { onMessageUpdate } from "./util/onMessageUpdate.js";

import { escapeCodeBlock } from "discord.js";
import { InternalPosterPlugin } from "../InternalPoster/InternalPosterPlugin.js";
import { LogsGuildMemberRoleChangeEvt } from "./events/LogsGuildMemberRoleChangeEvt.js";
import { logAutomodAction } from "./logFunctions/logAutomodAction.js";
import { logBotAlert } from "./logFunctions/logBotAlert.js";
import { logCaseCreate } from "./logFunctions/logCaseCreate.js";
import { logCaseDelete } from "./logFunctions/logCaseDelete.js";
import { logCaseUpdate } from "./logFunctions/logCaseUpdate.js";
import { logCensor } from "./logFunctions/logCensor.js";
import { logChannelCreate } from "./logFunctions/logChannelCreate.js";
import { logChannelDelete } from "./logFunctions/logChannelDelete.js";
import { logChannelUpdate } from "./logFunctions/logChannelUpdate.js";
import { logClean } from "./logFunctions/logClean.js";
import { logDmFailed } from "./logFunctions/logDmFailed.js";
import { logEmojiCreate } from "./logFunctions/logEmojiCreate.js";
import { logEmojiDelete } from "./logFunctions/logEmojiDelete.js";
import { logEmojiUpdate } from "./logFunctions/logEmojiUpdate.js";
import { logMassBan } from "./logFunctions/logMassBan.js";
import { logMassMute } from "./logFunctions/logMassMute.js";
import { logMassUnban } from "./logFunctions/logMassUnban.js";
import { logMemberBan } from "./logFunctions/logMemberBan.js";
import { logMemberForceban } from "./logFunctions/logMemberForceban.js";
import { logMemberJoin } from "./logFunctions/logMemberJoin.js";
import { logMemberJoinWithPriorRecords } from "./logFunctions/logMemberJoinWithPriorRecords.js";
import { logMemberKick } from "./logFunctions/logMemberKick.js";
import { logMemberLeave } from "./logFunctions/logMemberLeave.js";
import { logMemberMute } from "./logFunctions/logMemberMute.js";
import { logMemberMuteExpired } from "./logFunctions/logMemberMuteExpired.js";
import { logMemberMuteRejoin } from "./logFunctions/logMemberMuteRejoin.js";
import { logMemberNickChange } from "./logFunctions/logMemberNickChange.js";
import { logMemberNote } from "./logFunctions/logMemberNote.js";
import { logMemberRestore } from "./logFunctions/logMemberRestore.js";
import { logMemberRoleAdd } from "./logFunctions/logMemberRoleAdd.js";
import { logMemberRoleChanges } from "./logFunctions/logMemberRoleChanges.js";
import { logMemberRoleRemove } from "./logFunctions/logMemberRoleRemove.js";
import { logMemberTimedBan } from "./logFunctions/logMemberTimedBan.js";
import { logMemberTimedMute } from "./logFunctions/logMemberTimedMute.js";
import { logMemberTimedUnban } from "./logFunctions/logMemberTimedUnban.js";
import { logMemberTimedUnmute } from "./logFunctions/logMemberTimedUnmute.js";
import { logMemberUnban } from "./logFunctions/logMemberUnban.js";
import { logMemberUnmute } from "./logFunctions/logMemberUnmute.js";
import { logMemberWarn } from "./logFunctions/logMemberWarn.js";
import { logMessageDelete } from "./logFunctions/logMessageDelete.js";
import { logMessageDeleteAuto } from "./logFunctions/logMessageDeleteAuto.js";
import { logMessageDeleteBare } from "./logFunctions/logMessageDeleteBare.js";
import { logMessageDeleteBulk } from "./logFunctions/logMessageDeleteBulk.js";
import { logMessageEdit } from "./logFunctions/logMessageEdit.js";
import { logMessageSpamDetected } from "./logFunctions/logMessageSpamDetected.js";
import { logOtherSpamDetected } from "./logFunctions/logOtherSpamDetected.js";
import { logPostedScheduledMessage } from "./logFunctions/logPostedScheduledMessage.js";
import { logRepeatedMessage } from "./logFunctions/logRepeatedMessage.js";
import { logRoleCreate } from "./logFunctions/logRoleCreate.js";
import { logRoleDelete } from "./logFunctions/logRoleDelete.js";
import { logRoleUpdate } from "./logFunctions/logRoleUpdate.js";
import { logScheduledMessage } from "./logFunctions/logScheduledMessage.js";
import { logScheduledRepeatedMessage } from "./logFunctions/logScheduledRepeatedMessage.js";
import { logSetAntiraidAuto } from "./logFunctions/logSetAntiraidAuto.js";
import { logSetAntiraidUser } from "./logFunctions/logSetAntiraidUser.js";
import { logStageInstanceCreate } from "./logFunctions/logStageInstanceCreate.js";
import { logStageInstanceDelete } from "./logFunctions/logStageInstanceDelete.js";
import { logStageInstanceUpdate } from "./logFunctions/logStageInstanceUpdate.js";
import { logStickerCreate } from "./logFunctions/logStickerCreate.js";
import { logStickerDelete } from "./logFunctions/logStickerDelete.js";
import { logStickerUpdate } from "./logFunctions/logStickerUpdate.js";
import { logThreadCreate } from "./logFunctions/logThreadCreate.js";
import { logThreadDelete } from "./logFunctions/logThreadDelete.js";
import { logThreadUpdate } from "./logFunctions/logThreadUpdate.js";
import { logVoiceChannelForceDisconnect } from "./logFunctions/logVoiceChannelForceDisconnect.js";
import { logVoiceChannelForceMove } from "./logFunctions/logVoiceChannelForceMove.js";
import { logVoiceChannelJoin } from "./logFunctions/logVoiceChannelJoin.js";
import { logVoiceChannelLeave } from "./logFunctions/logVoiceChannelLeave.js";
import { logVoiceChannelMove } from "./logFunctions/logVoiceChannelMove.js";

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
