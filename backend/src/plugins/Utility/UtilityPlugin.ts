import { Snowflake } from "discord.js";
import { PluginOptions, guildPlugin } from "knub";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildCases } from "../../data/GuildCases.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { Supporters } from "../../data/Supporters.js";
import { makePublicFn, sendSuccessMessage } from "../../pluginUtils.js";
import { discardRegExpRunner, getRegExpRunner } from "../../regExpRunners.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { ModActionsPlugin } from "../ModActions/ModActionsPlugin.js";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin.js";
import { AboutCmd } from "./commands/AboutCmd.js";
import { AvatarCmd } from "./commands/AvatarCmd.js";
import { BanSearchCmd } from "./commands/BanSearchCmd.js";
import { ChannelInfoCmd } from "./commands/ChannelInfoCmd.js";
import { CleanCmd, cleanCmd } from "./commands/CleanCmd.js";
import { ContextCmd } from "./commands/ContextCmd.js";
import { EmojiInfoCmd } from "./commands/EmojiInfoCmd.js";
import { HelpCmd } from "./commands/HelpCmd.js";
import { InfoCmd } from "./commands/InfoCmd.js";
import { InviteInfoCmd } from "./commands/InviteInfoCmd.js";
import { JumboCmd } from "./commands/JumboCmd.js";
import { LevelCmd } from "./commands/LevelCmd.js";
import { MessageInfoCmd } from "./commands/MessageInfoCmd.js";
import { NicknameCmd } from "./commands/NicknameCmd.js";
import { NicknameResetCmd } from "./commands/NicknameResetCmd.js";
import { PingCmd } from "./commands/PingCmd.js";
import { ReloadGuildCmd } from "./commands/ReloadGuildCmd.js";
import { RoleInfoCmd } from "./commands/RoleInfoCmd.js";
import { RolesCmd } from "./commands/RolesCmd.js";
import { SearchCmd } from "./commands/SearchCmd.js";
import { ServerInfoCmd } from "./commands/ServerInfoCmd.js";
import { SnowflakeInfoCmd } from "./commands/SnowflakeInfoCmd.js";
import { SourceCmd } from "./commands/SourceCmd.js";
import { UserInfoCmd } from "./commands/UserInfoCmd.js";
import { VcdisconnectCmd } from "./commands/VcdisconnectCmd.js";
import { VcmoveAllCmd, VcmoveCmd } from "./commands/VcmoveCmd.js";
import { AutoJoinThreadEvt, AutoJoinThreadSyncEvt } from "./events/AutoJoinThreadEvt.js";
import { getUserInfoEmbed } from "./functions/getUserInfoEmbed.js";
import { hasPermission } from "./functions/hasPermission.js";
import { activeReloads } from "./guildReloads.js";
import { refreshMembersIfNeeded } from "./refreshMembers.js";
import { UtilityPluginType, zUtilityConfig } from "./types.js";

const defaultOptions: PluginOptions<UtilityPluginType> = {
  config: {
    can_roles: false,
    can_level: false,
    can_search: false,
    can_clean: false,
    can_info: false,
    can_server: false,
    can_inviteinfo: false,
    can_channelinfo: false,
    can_messageinfo: false,
    can_userinfo: false,
    can_roleinfo: false,
    can_emojiinfo: false,
    can_snowflake: false,
    can_reload_guild: false,
    can_nickname: false,
    can_ping: false,
    can_source: false,
    can_vcmove: false,
    can_vckick: false,
    can_help: false,
    can_about: false,
    can_context: false,
    can_jumbo: false,
    jumbo_size: 128,
    can_avatar: false,
    info_on_single_result: true,
    autojoin_threads: true,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_roles: true,
        can_level: true,
        can_search: true,
        can_clean: true,
        can_info: true,
        can_server: true,
        can_inviteinfo: true,
        can_channelinfo: true,
        can_messageinfo: true,
        can_userinfo: true,
        can_roleinfo: true,
        can_emojiinfo: true,
        can_snowflake: true,
        can_nickname: true,
        can_vcmove: true,
        can_vckick: true,
        can_help: true,
        can_context: true,
        can_jumbo: true,
        can_avatar: true,
        can_source: true,
      },
    },
    {
      level: ">=100",
      config: {
        can_reload_guild: true,
        can_ping: true,
        can_about: true,
      },
    },
  ],
};

export const UtilityPlugin = guildPlugin<UtilityPluginType>()({
  name: "utility",

  dependencies: () => [TimeAndDatePlugin, ModActionsPlugin, LogsPlugin],
  configParser: (input) => zUtilityConfig.parse(input),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
    SearchCmd,
    BanSearchCmd,
    UserInfoCmd,
    LevelCmd,
    RolesCmd,
    ServerInfoCmd,
    NicknameResetCmd,
    NicknameCmd,
    PingCmd,
    SourceCmd,
    ContextCmd,
    VcmoveCmd,
    VcdisconnectCmd,
    VcmoveAllCmd,
    HelpCmd,
    AboutCmd,
    ReloadGuildCmd,
    JumboCmd,
    AvatarCmd,
    CleanCmd,
    InviteInfoCmd,
    ChannelInfoCmd,
    MessageInfoCmd,
    InfoCmd,
    SnowflakeInfoCmd,
    RoleInfoCmd,
    EmojiInfoCmd,
  ],

  // prettier-ignore
  events: [
    AutoJoinThreadEvt,
    AutoJoinThreadSyncEvt,
  ],

  public(pluginData) {
    return {
      clean: makePublicFn(pluginData, cleanCmd),
      userInfo: (userId: Snowflake) => getUserInfoEmbed(pluginData, userId, false),
      hasPermission: makePublicFn(pluginData, hasPermission),
    };
  },

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.logs = new GuildLogs(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.archives = GuildArchives.getGuildInstance(guild.id);
    state.supporters = new Supporters();

    state.regexRunner = getRegExpRunner(`guild-${pluginData.guild.id}`);

    state.lastReload = Date.now();

    // FIXME: Temp fix for role change detection for specific servers, load all guild members in the background on bot start
    const roleChangeDetectionFixServers = [
      "786212572285763605",
      "653681924384096287",
      "493351982887862283",
      "513338222810497041",
      "523043978178723840",
      "718076393295970376",
      "803251072877199400",
      "750492934343753798",
    ];
    if (roleChangeDetectionFixServers.includes(pluginData.guild.id)) {
      refreshMembersIfNeeded(pluginData.guild);
    }
  },

  afterLoad(pluginData) {
    const { guild } = pluginData;

    if (activeReloads.has(guild.id)) {
      sendSuccessMessage(pluginData, activeReloads.get(guild.id)!, "Reloaded!");
      activeReloads.delete(guild.id);
    }
  },

  beforeUnload(pluginData) {
    discardRegExpRunner(`guild-${pluginData.guild.id}`);
  },
});
