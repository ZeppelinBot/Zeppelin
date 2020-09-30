import * as t from "io-ts";
import { BasePluginType, guildEventListener } from "knub";
import { TRegex } from "../../validatorUtils";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { tMessageContent, tNullable } from "../../utils";
import { RegExpRunner } from "../../RegExpRunner";

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
  format: tNullable(tLogFormats),
});
export type TLogChannel = t.TypeOf<typeof LogChannel>;

const LogChannelMap = t.record(t.string, LogChannel);
export type TLogChannelMap = t.TypeOf<typeof LogChannelMap>;

export const ConfigSchema = t.type({
  channels: LogChannelMap,
  format: t.intersection([
    tLogFormats,
    t.type({
      timestamp: t.string,
    }),
  ]),
  ping_user: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface LogsPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    guildLogs: GuildLogs;
    savedMessages: GuildSavedMessages;
    archives: GuildArchives;
    cases: GuildCases;

    regexRunner: RegExpRunner;
    regexRunnerTimeoutListener;
    regexRunnerRepeatedTimeoutListener;

    logListener;

    batches: Map<string, string[]>;

    onMessageDeleteFn;
    onMessageDeleteBulkFn;
    onMessageUpdateFn;
  };
}

export const logsEvt = guildEventListener<LogsPluginType>();
