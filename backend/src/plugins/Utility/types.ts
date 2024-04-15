import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "knub";
import z from "zod";
import { RegExpRunner } from "../../RegExpRunner";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { Supporters } from "../../data/Supporters";
import { CommonPlugin } from "../Common/CommonPlugin";

export const zUtilityConfig = z.strictObject({
  can_roles: z.boolean(),
  can_level: z.boolean(),
  can_search: z.boolean(),
  can_clean: z.boolean(),
  can_info: z.boolean(),
  can_server: z.boolean(),
  can_inviteinfo: z.boolean(),
  can_channelinfo: z.boolean(),
  can_messageinfo: z.boolean(),
  can_userinfo: z.boolean(),
  can_roleinfo: z.boolean(),
  can_emojiinfo: z.boolean(),
  can_snowflake: z.boolean(),
  can_reload_guild: z.boolean(),
  can_nickname: z.boolean(),
  can_ping: z.boolean(),
  can_source: z.boolean(),
  can_vcmove: z.boolean(),
  can_vckick: z.boolean(),
  can_help: z.boolean(),
  can_about: z.boolean(),
  can_context: z.boolean(),
  can_jumbo: z.boolean(),
  jumbo_size: z.number(),
  can_avatar: z.boolean(),
  info_on_single_result: z.boolean(),
  autojoin_threads: z.boolean(),
});

export interface UtilityPluginType extends BasePluginType {
  config: z.infer<typeof zUtilityConfig>;
  state: {
    logs: GuildLogs;
    cases: GuildCases;
    savedMessages: GuildSavedMessages;
    archives: GuildArchives;
    supporters: Supporters;
    regexRunner: RegExpRunner;

    lastReload: number;

    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const utilityCmd = guildPluginMessageCommand<UtilityPluginType>();
export const utilityEvt = guildPluginEventListener<UtilityPluginType>();
