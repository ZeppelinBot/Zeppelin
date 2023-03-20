import * as t from "io-ts";
import { BasePluginType, CooldownManager, guildPluginEventListener } from "knub";
import { z } from "zod";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { LogType } from "../../data/LogType";
import { RegExpRunner } from "../../RegExpRunner";
import { tMessageContent, tNullable } from "../../utils";
import { MessageBuffer } from "../../utils/MessageBuffer";
import {
  TemplateSafeCase,
  TemplateSafeChannel,
  TemplateSafeEmoji,
  TemplateSafeMember,
  TemplateSafeRole,
  TemplateSafeSavedMessage,
  TemplateSafeStage,
  TemplateSafeSticker,
  TemplateSafeUnknownMember,
  TemplateSafeUnknownUser,
  TemplateSafeUser,
} from "../../utils/templateSafeObjects";
import { TRegex } from "../../validatorUtils";

export const tLogFormats = t.record(t.string, t.union([t.string, tMessageContent]));
export type TLogFormats = t.TypeOf<typeof tLogFormats>;

const LogChannel = t.partial({
  include: t.array(t.string),
  exclude: t.array(t.string),
  batched: t.boolean,
  batch_time: t.number,
  excluded_users: t.array(t.string),
  excluded_message_regexes: t.array(TRegex),
  excluded_channels: t.array(t.string),
  excluded_categories: t.array(t.string),
  excluded_threads: t.array(t.string),
  exclude_bots: t.boolean,
  excluded_roles: t.array(t.string),
  format: tNullable(tLogFormats),
  timestamp_format: t.string,
  include_embed_timestamp: t.boolean,
});
export type TLogChannel = t.TypeOf<typeof LogChannel>;

const LogChannelMap = t.record(t.string, LogChannel);
export type TLogChannelMap = t.TypeOf<typeof LogChannelMap>;

export const ConfigSchema = t.type({
  channels: LogChannelMap,
  format: t.intersection([
    tLogFormats,
    t.type({
      timestamp: t.string, // Legacy/deprecated
    }),
  ]),
  ping_user: t.boolean, // Legacy/deprecated, if below is false mentions wont actually ping
  allow_user_mentions: t.boolean,
  timestamp_format: t.string,
  include_embed_timestamp: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

// Hacky way of allowing a """null""" default value for config.format.timestamp
// The type cannot be made nullable properly because io-ts's intersection type still considers
// that it has to match the record type of tLogFormats, which includes string.
export const FORMAT_NO_TIMESTAMP = "__NO_TIMESTAMP__";

export interface LogsPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    guildLogs: GuildLogs;
    savedMessages: GuildSavedMessages;
    archives: GuildArchives;
    cases: GuildCases;

    regexRunner: RegExpRunner;
    regexRunnerRepeatedTimeoutListener;

    logListener;

    buffers: Map<string, MessageBuffer>;
    channelCooldowns: CooldownManager;

    onMessageDeleteFn;
    onMessageDeleteBulkFn;
    onMessageUpdateFn;
  };
}

export const logsEvt = guildPluginEventListener<LogsPluginType>();

export const LogTypeData = z.object({
  [LogType.MEMBER_WARN]: z.object({
    mod: z.instanceof(TemplateSafeMember),
    member: z.instanceof(TemplateSafeMember),
    caseNumber: z.number(),
    reason: z.string(),
  }),

  [LogType.MEMBER_MUTE]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    user: z.instanceof(TemplateSafeUser),
    caseNumber: z.number(),
    reason: z.string(),
  }),

  [LogType.MEMBER_UNMUTE]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    user: z.instanceof(TemplateSafeUser),
    caseNumber: z.number(),
    reason: z.string(),
  }),

  [LogType.MEMBER_MUTE_EXPIRED]: z.object({
    member: z.instanceof(TemplateSafeMember).or(z.instanceof(TemplateSafeUnknownMember)),
  }),

  [LogType.MEMBER_KICK]: z.object({
    mod: z.instanceof(TemplateSafeUser).or(z.null()),
    user: z.instanceof(TemplateSafeUser),
    caseNumber: z.number(),
    reason: z.string(),
  }),

  [LogType.MEMBER_BAN]: z.object({
    mod: z.instanceof(TemplateSafeUser).or(z.null()),
    user: z.instanceof(TemplateSafeUser),
    caseNumber: z.number(),
    reason: z.string(),
  }),

  [LogType.MEMBER_UNBAN]: z.object({
    mod: z.instanceof(TemplateSafeUser).or(z.null()),
    userId: z.string(),
    caseNumber: z.number(),
    reason: z.string(),
  }),

  [LogType.MEMBER_FORCEBAN]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    userId: z.string(),
    caseNumber: z.number(),
    reason: z.string(),
  }),

  [LogType.MEMBER_JOIN]: z.object({
    member: z.instanceof(TemplateSafeMember),
    new: z.string(),
    account_age: z.string(),
  }),

  [LogType.MEMBER_LEAVE]: z.object({
    member: z.instanceof(TemplateSafeMember),
  }),

  [LogType.MEMBER_ROLE_ADD]: z.object({
    mod: z.instanceof(TemplateSafeUser).or(z.null()),
    member: z.instanceof(TemplateSafeMember),
    roles: z.string(),
  }),

  [LogType.MEMBER_ROLE_REMOVE]: z.object({
    mod: z.instanceof(TemplateSafeUser).or(z.null()),
    member: z.instanceof(TemplateSafeMember),
    roles: z.string(),
  }),

  [LogType.MEMBER_NICK_CHANGE]: z.object({
    member: z.instanceof(TemplateSafeMember),
    oldNick: z.string(),
    newNick: z.string(),
  }),

  [LogType.MEMBER_RESTORE]: z.object({
    member: z.instanceof(TemplateSafeMember),
    restoredData: z.string(),
  }),

  [LogType.CHANNEL_CREATE]: z.object({
    channel: z.instanceof(TemplateSafeChannel),
  }),

  [LogType.CHANNEL_DELETE]: z.object({
    channel: z.instanceof(TemplateSafeChannel),
  }),

  [LogType.CHANNEL_UPDATE]: z.object({
    oldChannel: z.instanceof(TemplateSafeChannel),
    newChannel: z.instanceof(TemplateSafeChannel),
    differenceString: z.string(),
  }),

  [LogType.THREAD_CREATE]: z.object({
    thread: z.instanceof(TemplateSafeChannel),
  }),

  [LogType.THREAD_DELETE]: z.object({
    thread: z.instanceof(TemplateSafeChannel),
  }),

  [LogType.THREAD_UPDATE]: z.object({
    oldThread: z.instanceof(TemplateSafeChannel),
    newThread: z.instanceof(TemplateSafeChannel),
    differenceString: z.string(),
  }),

  [LogType.ROLE_CREATE]: z.object({
    role: z.instanceof(TemplateSafeRole),
  }),

  [LogType.ROLE_DELETE]: z.object({
    role: z.instanceof(TemplateSafeRole),
  }),

  [LogType.ROLE_UPDATE]: z.object({
    oldRole: z.instanceof(TemplateSafeRole),
    newRole: z.instanceof(TemplateSafeRole),
    differenceString: z.string(),
  }),

  [LogType.MESSAGE_EDIT]: z.object({
    user: z.instanceof(TemplateSafeUser),
    channel: z.instanceof(TemplateSafeChannel),
    before: z.instanceof(TemplateSafeSavedMessage),
    after: z.instanceof(TemplateSafeSavedMessage),
  }),

  [LogType.MESSAGE_DELETE]: z.object({
    user: z.instanceof(TemplateSafeUser),
    channel: z.instanceof(TemplateSafeChannel),
    messageDate: z.string(),
    message: z.instanceof(TemplateSafeSavedMessage),
  }),

  [LogType.MESSAGE_DELETE_BULK]: z.object({
    count: z.number(),
    authorIds: z.array(z.string()),
    channel: z.instanceof(TemplateSafeChannel),
    archiveUrl: z.string(),
  }),

  [LogType.MESSAGE_DELETE_BARE]: z.object({
    messageId: z.string(),
    channel: z.instanceof(TemplateSafeChannel),
  }),

  [LogType.VOICE_CHANNEL_JOIN]: z.object({
    member: z.instanceof(TemplateSafeMember),
    channel: z.instanceof(TemplateSafeChannel),
  }),

  [LogType.VOICE_CHANNEL_LEAVE]: z.object({
    member: z.instanceof(TemplateSafeMember),
    channel: z.instanceof(TemplateSafeChannel),
  }),

  [LogType.VOICE_CHANNEL_MOVE]: z.object({
    member: z.instanceof(TemplateSafeMember),
    oldChannel: z.instanceof(TemplateSafeChannel),
    newChannel: z.instanceof(TemplateSafeChannel),
  }),

  [LogType.STAGE_INSTANCE_CREATE]: z.object({
    stageInstance: z.instanceof(TemplateSafeStage),
    stageChannel: z.instanceof(TemplateSafeChannel),
  }),

  [LogType.STAGE_INSTANCE_DELETE]: z.object({
    stageInstance: z.instanceof(TemplateSafeStage),
    stageChannel: z.instanceof(TemplateSafeChannel),
  }),

  [LogType.STAGE_INSTANCE_UPDATE]: z.object({
    oldStageInstance: z.instanceof(TemplateSafeStage).or(z.null()),
    newStageInstance: z.instanceof(TemplateSafeStage),
    stageChannel: z.instanceof(TemplateSafeChannel),
    differenceString: z.string(),
  }),

  [LogType.EMOJI_CREATE]: z.object({
    emoji: z.instanceof(TemplateSafeEmoji),
  }),

  [LogType.EMOJI_DELETE]: z.object({
    emoji: z.instanceof(TemplateSafeEmoji),
  }),

  [LogType.EMOJI_UPDATE]: z.object({
    oldEmoji: z.instanceof(TemplateSafeEmoji),
    newEmoji: z.instanceof(TemplateSafeEmoji),
    differenceString: z.string(),
  }),

  [LogType.STICKER_CREATE]: z.object({
    sticker: z.instanceof(TemplateSafeSticker),
  }),

  [LogType.STICKER_DELETE]: z.object({
    sticker: z.instanceof(TemplateSafeSticker),
  }),

  [LogType.STICKER_UPDATE]: z.object({
    oldSticker: z.instanceof(TemplateSafeSticker),
    newSticker: z.instanceof(TemplateSafeSticker),
    differenceString: z.string(),
  }),

  [LogType.MESSAGE_SPAM_DETECTED]: z.object({
    member: z.instanceof(TemplateSafeMember),
    channel: z.instanceof(TemplateSafeChannel),
    description: z.string(),
    limit: z.number(),
    interval: z.number(),
    archiveUrl: z.string(),
  }),

  [LogType.CENSOR]: z.object({
    user: z.instanceof(TemplateSafeUser),
    channel: z.instanceof(TemplateSafeChannel),
    reason: z.string(),
    message: z.instanceof(TemplateSafeSavedMessage),
    messageText: z.string(),
  }),

  [LogType.CLEAN]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    channel: z.instanceof(TemplateSafeChannel),
    count: z.number(),
    archiveUrl: z.string(),
  }),

  [LogType.CASE_CREATE]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    userId: z.string(),
    caseNum: z.number(),
    caseType: z.string(),
    reason: z.string(),
  }),

  [LogType.MASSUNBAN]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    count: z.number(),
    reason: z.string(),
  }),

  [LogType.MASSBAN]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    count: z.number(),
    reason: z.string(),
  }),

  [LogType.MASSMUTE]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    count: z.number(),
  }),

  [LogType.MEMBER_TIMED_MUTE]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    user: z.instanceof(TemplateSafeUser),
    time: z.string(),
    caseNumber: z.number(),
    reason: z.string(),
  }),

  [LogType.MEMBER_TIMED_UNMUTE]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    user: z.instanceof(TemplateSafeUser),
    time: z.string(),
    caseNumber: z.number(),
    reason: z.string(),
  }),

  [LogType.MEMBER_TIMED_BAN]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    user: z.instanceof(TemplateSafeUser),
    banTime: z.string(),
    caseNumber: z.number(),
    reason: z.string(),
  }),

  [LogType.MEMBER_TIMED_UNBAN]: z.object({
    mod: z.instanceof(TemplateSafeUser).or(z.instanceof(TemplateSafeUnknownUser)),
    userId: z.string(),
    banTime: z.string(),
    caseNumber: z.number(),
    reason: z.string(),
  }),

  [LogType.MEMBER_JOIN_WITH_PRIOR_RECORDS]: z.object({
    member: z.instanceof(TemplateSafeMember),
    recentCaseSummary: z.string(),
  }),

  [LogType.OTHER_SPAM_DETECTED]: z.object({
    member: z.instanceof(TemplateSafeMember),
    description: z.string(),
    limit: z.number(),
    interval: z.number(),
  }),

  [LogType.MEMBER_ROLE_CHANGES]: z.object({
    mod: z.instanceof(TemplateSafeUser).or(z.instanceof(TemplateSafeUnknownUser)).or(z.null()),
    member: z.instanceof(TemplateSafeMember),
    addedRoles: z.string(),
    removedRoles: z.string(),
  }),

  [LogType.VOICE_CHANNEL_FORCE_MOVE]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    member: z.instanceof(TemplateSafeMember),
    oldChannel: z.instanceof(TemplateSafeChannel),
    newChannel: z.instanceof(TemplateSafeChannel),
  }),

  [LogType.VOICE_CHANNEL_FORCE_DISCONNECT]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    member: z.instanceof(TemplateSafeMember),
    oldChannel: z.instanceof(TemplateSafeChannel),
  }),

  [LogType.CASE_UPDATE]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    caseNumber: z.number(),
    caseType: z.string(),
    note: z.string(),
  }),

  [LogType.MEMBER_MUTE_REJOIN]: z.object({
    member: z.instanceof(TemplateSafeMember),
  }),

  [LogType.SCHEDULED_MESSAGE]: z.object({
    author: z.instanceof(TemplateSafeUser),
    channel: z.instanceof(TemplateSafeChannel),
    datetime: z.string(),
    date: z.string(),
    time: z.string(),
  }),

  [LogType.POSTED_SCHEDULED_MESSAGE]: z.object({
    author: z.instanceof(TemplateSafeUser),
    channel: z.instanceof(TemplateSafeChannel),
    messageId: z.string(),
  }),

  [LogType.BOT_ALERT]: z.object({
    body: z.string(),
  }),

  [LogType.AUTOMOD_ACTION]: z.object({
    rule: z.string(),
    user: z.instanceof(TemplateSafeUser).nullable(),
    users: z.array(z.instanceof(TemplateSafeUser)),
    actionsTaken: z.string(),
    matchSummary: z.string(),
  }),

  [LogType.SCHEDULED_REPEATED_MESSAGE]: z.object({
    author: z.instanceof(TemplateSafeUser),
    channel: z.instanceof(TemplateSafeChannel),
    datetime: z.string(),
    date: z.string(),
    time: z.string(),
    repeatInterval: z.string(),
    repeatDetails: z.string(),
  }),

  [LogType.REPEATED_MESSAGE]: z.object({
    author: z.instanceof(TemplateSafeUser),
    channel: z.instanceof(TemplateSafeChannel),
    datetime: z.string(),
    date: z.string(),
    time: z.string(),
    repeatInterval: z.string(),
    repeatDetails: z.string(),
  }),

  [LogType.MESSAGE_DELETE_AUTO]: z.object({
    message: z.instanceof(TemplateSafeSavedMessage),
    user: z.instanceof(TemplateSafeUser),
    channel: z.instanceof(TemplateSafeChannel),
    messageDate: z.string(),
  }),

  [LogType.SET_ANTIRAID_USER]: z.object({
    level: z.string(),
    user: z.instanceof(TemplateSafeUser),
  }),

  [LogType.SET_ANTIRAID_AUTO]: z.object({
    level: z.string(),
  }),

  [LogType.MEMBER_NOTE]: z.object({
    mod: z.instanceof(TemplateSafeUser),
    user: z.instanceof(TemplateSafeUser),
    caseNumber: z.number(),
    reason: z.string(),
  }),

  [LogType.CASE_DELETE]: z.object({
    mod: z.instanceof(TemplateSafeMember),
    case: z.instanceof(TemplateSafeCase),
  }),

  [LogType.DM_FAILED]: z.object({
    source: z.string(),
    user: z.instanceof(TemplateSafeUser).or(z.instanceof(TemplateSafeUnknownUser)),
  }),
});

export type ILogTypeData = z.infer<typeof LogTypeData>;
