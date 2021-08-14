import * as t from "io-ts";
import { BasePluginType, typedGuildEventListener } from "knub";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { RegExpRunner } from "../../RegExpRunner";
import { tMessageContent, tNullable } from "../../utils";
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

    batches: Map<string, string[]>;

    onMessageDeleteFn;
    onMessageDeleteBulkFn;
    onMessageUpdateFn;
  };
}

export const logsEvt = typedGuildEventListener<LogsPluginType>();
