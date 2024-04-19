import { BasePluginType } from "knub";
import z from "zod";
import { RegExpRunner } from "../../RegExpRunner";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { zBoundedCharacters, zRegex, zSnowflake } from "../../utils";

export const zCensorConfig = z.strictObject({
  filter_zalgo: z.boolean(),
  filter_invites: z.boolean(),
  invite_guild_whitelist: z.array(zSnowflake).nullable(),
  invite_guild_blacklist: z.array(zSnowflake).nullable(),
  invite_code_whitelist: z.array(zBoundedCharacters(0, 16)).nullable(),
  invite_code_blacklist: z.array(zBoundedCharacters(0, 16)).nullable(),
  allow_group_dm_invites: z.boolean(),
  filter_domains: z.boolean(),
  domain_whitelist: z.array(zBoundedCharacters(0, 255)).nullable(),
  domain_blacklist: z.array(zBoundedCharacters(0, 255)).nullable(),
  blocked_tokens: z.array(zBoundedCharacters(0, 2000)).nullable(),
  blocked_words: z.array(zBoundedCharacters(0, 2000)).nullable(),
  blocked_regex: z.array(zRegex(z.string().max(1000))).nullable(),
});

export interface CensorPluginType extends BasePluginType {
  config: z.infer<typeof zCensorConfig>;
  state: {
    serverLogs: GuildLogs;
    savedMessages: GuildSavedMessages;

    regexRunner: RegExpRunner;

    onMessageCreateFn;
    onMessageUpdateFn;
  };
}
