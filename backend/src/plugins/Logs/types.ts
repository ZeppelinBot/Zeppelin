import { BasePluginType, CooldownManager, guildPluginEventListener } from "knub";
import { z } from "zod";
import { RegExpRunner } from "../../RegExpRunner.js";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildCases } from "../../data/GuildCases.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { LogType } from "../../data/LogType.js";
import { zBoundedCharacters, zMessageContent, zRegex, zSnowflake } from "../../utils.js";
import { MessageBuffer } from "../../utils/MessageBuffer.js";
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
} from "../../utils/templateSafeObjects.js";

const DEFAULT_BATCH_TIME = 1000;
const MIN_BATCH_TIME = 250;
const MAX_BATCH_TIME = 5000;

// A bit of a workaround so we can pass LogType keys to z.enum()
const logTypes = Object.keys(LogType) as [keyof typeof LogType, ...Array<keyof typeof LogType>];
const zLogFormats = z.record(z.enum(logTypes), zMessageContent);

const zLogChannel = z.strictObject({
  include: z.array(zBoundedCharacters(1, 255)).default([]),
  exclude: z.array(zBoundedCharacters(1, 255)).default([]),
  batched: z.boolean().default(true),
  batch_time: z.number().min(MIN_BATCH_TIME).max(MAX_BATCH_TIME).default(DEFAULT_BATCH_TIME),
  excluded_users: z.array(zSnowflake).nullable().default(null),
  excluded_message_regexes: z.array(zRegex(z.string())).nullable().default(null),
  excluded_channels: z.array(zSnowflake).nullable().default(null),
  excluded_categories: z.array(zSnowflake).nullable().default(null),
  excluded_threads: z.array(zSnowflake).nullable().default(null),
  exclude_bots: z.boolean().default(false),
  excluded_roles: z.array(zSnowflake).nullable().default(null),
  format: zLogFormats.default({}),
  timestamp_format: z.string().nullable().default(null),
  include_embed_timestamp: z.boolean().nullable().default(null),
});
export type TLogChannel = z.infer<typeof zLogChannel>;

const zLogChannelMap = z.record(zSnowflake, zLogChannel);
export type TLogChannelMap = z.infer<typeof zLogChannelMap>;

export const zLogsConfig = z.strictObject({
  channels: zLogChannelMap,
  format: zLogFormats,
  // Legacy/deprecated, if below is false mentions wont actually ping. In case you really want the old behavior, set below to true
  ping_user: z.boolean(),
  allow_user_mentions: z.boolean(),
  timestamp_format: z.string().nullable(),
  include_embed_timestamp: z.boolean(),
});

// Hacky way of allowing a """null""" default value for config.format.timestamp due to legacy io-ts reasons
export const FORMAT_NO_TIMESTAMP = "__NO_TIMESTAMP__";

export interface LogsPluginType extends BasePluginType {
  config: z.infer<typeof zLogsConfig>;
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
    account_age_ts: z.string(),
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
