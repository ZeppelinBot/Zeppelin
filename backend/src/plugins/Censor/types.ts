import { BasePluginType } from "vety";
import { z } from "zod";
import { RegExpRunner } from "../../RegExpRunner.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { zBoundedCharacters, zRegex, zSnowflake } from "../../utils.js";

export const zCensorConfig = z.strictObject({
  filter_zalgo: z.boolean().default(false),
  filter_invites: z.boolean().default(false),
  invite_guild_whitelist: z.array(zSnowflake).nullable().default(null),
  invite_guild_blacklist: z.array(zSnowflake).nullable().default(null),
  invite_code_whitelist: z.array(zBoundedCharacters(0, 16)).nullable().default(null),
  invite_code_blacklist: z.array(zBoundedCharacters(0, 16)).nullable().default(null),
  allow_group_dm_invites: z.boolean().default(false),
  filter_domains: z.boolean().default(false),
  domain_whitelist: z.array(zBoundedCharacters(0, 255)).nullable().default(null),
  domain_blacklist: z.array(zBoundedCharacters(0, 255)).nullable().default(null),
  blocked_tokens: z.array(zBoundedCharacters(0, 2000)).nullable().default(null),
  blocked_words: z.array(zBoundedCharacters(0, 2000)).nullable().default(null),
  blocked_regex: z
    .array(zRegex(z.string().max(1000)))
    .nullable()
    .default(null),
});

export interface CensorPluginType extends BasePluginType {
  configSchema: typeof zCensorConfig;
  state: {
    serverLogs: GuildLogs;
    savedMessages: GuildSavedMessages;

    regexRunner: RegExpRunner;

    onMessageCreateFn;
    onMessageUpdateFn;
  };
}
