import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { RegExpRunner } from "../../RegExpRunner.js";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildCases } from "../../data/GuildCases.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { Supporters } from "../../data/Supporters.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zUtilityConfig = z.strictObject({
  can_roles: z.boolean().default(false),
  can_level: z.boolean().default(false),
  can_search: z.boolean().default(false),
  can_clean: z.boolean().default(false),
  can_info: z.boolean().default(false),
  can_server: z.boolean().default(false),
  can_inviteinfo: z.boolean().default(false),
  can_channelinfo: z.boolean().default(false),
  can_messageinfo: z.boolean().default(false),
  can_userinfo: z.boolean().default(false),
  can_roleinfo: z.boolean().default(false),
  can_emojiinfo: z.boolean().default(false),
  can_snowflake: z.boolean().default(false),
  can_reload_guild: z.boolean().default(false),
  can_nickname: z.boolean().default(false),
  can_ping: z.boolean().default(false),
  can_source: z.boolean().default(false),
  can_vcmove: z.boolean().default(false),
  can_vckick: z.boolean().default(false),
  can_help: z.boolean().default(false),
  can_about: z.boolean().default(false),
  can_context: z.boolean().default(false),
  can_jumbo: z.boolean().default(false),
  jumbo_size: z.number().default(128),
  can_avatar: z.boolean().default(false),
  info_on_single_result: z.boolean().default(true),
  autojoin_threads: z.boolean().default(true),
});

export interface UtilityPluginType extends BasePluginType {
  configSchema: typeof zUtilityConfig;
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
