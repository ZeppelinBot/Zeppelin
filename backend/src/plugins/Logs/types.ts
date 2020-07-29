import * as t from "io-ts";
import { BasePluginType, eventListener } from "knub";
import { TSafeRegex } from "src/validatorUtils";
import { GuildLogs } from "src/data/GuildLogs";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildArchives } from "src/data/GuildArchives";
import { GuildCases } from "src/data/GuildCases";
import { tMessageContent } from "../../utils";

const LogChannel = t.partial({
  include: t.array(t.string),
  exclude: t.array(t.string),
  batched: t.boolean,
  batch_time: t.number,
  excluded_users: t.array(t.string),
  excluded_message_regexes: t.array(TSafeRegex),
  excluded_channels: t.array(t.string),
});
export type TLogChannel = t.TypeOf<typeof LogChannel>;

const LogChannelMap = t.record(t.string, LogChannel);
export type TLogChannelMap = t.TypeOf<typeof LogChannelMap>;

const tLogFormats = t.intersection([
  t.record(t.string, t.union([t.string, tMessageContent])),
  t.type({
    timestamp: t.string,
  }),
]);

export const ConfigSchema = t.type({
  channels: LogChannelMap,
  format: tLogFormats,
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

    logListener;

    batches: Map<string, string[]>;

    onMessageDeleteFn;
    onMessageDeleteBulkFn;
    onMessageUpdateFn;

    excludedUserProps: string[];
  };
}

export const logsEvent = eventListener<LogsPluginType>();
