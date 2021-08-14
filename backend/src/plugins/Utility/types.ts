import * as t from "io-ts";
import { BasePluginType, typedGuildCommand, typedGuildEventListener } from "knub";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { Supporters } from "../../data/Supporters";
import { RegExpRunner } from "../../RegExpRunner";

export const ConfigSchema = t.type({
  can_roles: t.boolean,
  can_level: t.boolean,
  can_search: t.boolean,
  can_clean: t.boolean,
  can_info: t.boolean,
  can_server: t.boolean,
  can_inviteinfo: t.boolean,
  can_channelinfo: t.boolean,
  can_messageinfo: t.boolean,
  can_userinfo: t.boolean,
  can_roleinfo: t.boolean,
  can_emojiinfo: t.boolean,
  can_snowflake: t.boolean,
  can_reload_guild: t.boolean,
  can_nickname: t.boolean,
  can_ping: t.boolean,
  can_source: t.boolean,
  can_vcmove: t.boolean,
  can_vckick: t.boolean,
  can_help: t.boolean,
  can_about: t.boolean,
  can_context: t.boolean,
  can_jumbo: t.boolean,
  jumbo_size: t.Integer,
  can_avatar: t.boolean,
  info_on_single_result: t.boolean,
  autojoin_threads: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface UtilityPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    logs: GuildLogs;
    cases: GuildCases;
    savedMessages: GuildSavedMessages;
    archives: GuildArchives;
    supporters: Supporters;
    regexRunner: RegExpRunner;

    lastReload: number;
  };
}

export const utilityCmd = typedGuildCommand<UtilityPluginType>();
export const utilityEvt = typedGuildEventListener<UtilityPluginType>();
