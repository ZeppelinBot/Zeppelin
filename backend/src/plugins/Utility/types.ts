import * as t from "io-ts";
import { BasePluginType, command, eventListener } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildCases } from "../../data/GuildCases";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildArchives } from "../../data/GuildArchives";
import { Supporters } from "../../data/Supporters";

export const ConfigSchema = t.type({
  can_roles: t.boolean,
  can_level: t.boolean,
  can_search: t.boolean,
  can_clean: t.boolean,
  can_info: t.boolean,
  can_server: t.boolean,
  can_invite: t.boolean,
  can_channel: t.boolean,
  can_message: t.boolean,
  can_reload_guild: t.boolean,
  can_nickname: t.boolean,
  can_ping: t.boolean,
  can_source: t.boolean,
  can_vcmove: t.boolean,
  can_help: t.boolean,
  can_about: t.boolean,
  can_context: t.boolean,
  can_jumbo: t.boolean,
  jumbo_size: t.Integer,
  can_avatar: t.boolean,
  info_on_single_result: t.boolean,
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

    lastReload: number;
  };
}

export const utilityCmd = command<UtilityPluginType>();
export const utilityEvent = eventListener<UtilityPluginType>();
