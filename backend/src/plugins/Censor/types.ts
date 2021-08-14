import * as t from "io-ts";
import { BasePluginType } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { RegExpRunner } from "../../RegExpRunner";
import { tNullable } from "../../utils";
import { TRegex } from "../../validatorUtils";

export const ConfigSchema = t.type({
  filter_zalgo: t.boolean,
  filter_invites: t.boolean,
  invite_guild_whitelist: tNullable(t.array(t.string)),
  invite_guild_blacklist: tNullable(t.array(t.string)),
  invite_code_whitelist: tNullable(t.array(t.string)),
  invite_code_blacklist: tNullable(t.array(t.string)),
  allow_group_dm_invites: t.boolean,
  filter_domains: t.boolean,
  domain_whitelist: tNullable(t.array(t.string)),
  domain_blacklist: tNullable(t.array(t.string)),
  blocked_tokens: tNullable(t.array(t.string)),
  blocked_words: tNullable(t.array(t.string)),
  blocked_regex: tNullable(t.array(TRegex)),
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface CensorPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    serverLogs: GuildLogs;
    savedMessages: GuildSavedMessages;

    regexRunner: RegExpRunner;

    onMessageCreateFn;
    onMessageUpdateFn;
  };
}
