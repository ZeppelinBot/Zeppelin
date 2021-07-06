import { PluginOptions } from "knub";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { Supporters } from "../../data/Supporters";
import { sendSuccessMessage } from "../../pluginUtils";
import { discardRegExpRunner, getRegExpRunner } from "../../regExpRunners";
import { ModActionsPlugin } from "../ModActions/ModActionsPlugin";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { AboutCmd } from "./commands/AboutCmd";
import { AvatarCmd } from "./commands/AvatarCmd";
import { BanSearchCmd } from "./commands/BanSearchCmd";
import { ChannelInfoCmd } from "./commands/ChannelInfoCmd";
import { CleanCmd } from "./commands/CleanCmd";
import { ContextCmd } from "./commands/ContextCmd";
import { EmojiInfoCmd } from "./commands/EmojiInfoCmd";
import { HelpCmd } from "./commands/HelpCmd";
import { InfoCmd } from "./commands/InfoCmd";
import { InviteInfoCmd } from "./commands/InviteInfoCmd";
import { JumboCmd } from "./commands/JumboCmd";
import { LevelCmd } from "./commands/LevelCmd";
import { MessageInfoCmd } from "./commands/MessageInfoCmd";
import { NicknameCmd } from "./commands/NicknameCmd";
import { NicknameResetCmd } from "./commands/NicknameResetCmd";
import { PingCmd } from "./commands/PingCmd";
import { ReloadGuildCmd } from "./commands/ReloadGuildCmd";
import { RoleInfoCmd } from "./commands/RoleInfoCmd";
import { RolesCmd } from "./commands/RolesCmd";
import { SearchCmd } from "./commands/SearchCmd";
import { ServerInfoCmd } from "./commands/ServerInfoCmd";
import { SnowflakeInfoCmd } from "./commands/SnowflakeInfoCmd";
import { SourceCmd } from "./commands/SourceCmd";
import { UserInfoCmd } from "./commands/UserInfoCmd";
import { VcdisconnectCmd } from "./commands/VcdisconnectCmd";
import { VcmoveAllCmd, VcmoveCmd } from "./commands/VcmoveCmd";
import { AutoJoinThreadEvt, AutoJoinThreadSyncEvt } from "./events/AutoJoinThreadEvt";
import { activeReloads } from "./guildReloads";
import { refreshMembersIfNeeded } from "./refreshMembers";
import { ConfigSchema, UtilityPluginType } from "./types";

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

export const UtilityPlugin = zeppelinGuildPlugin<UtilityPluginType>()({
  name: "utility",
  showInDocs: true,
  info: {
    prettyName: "Utility",
  },

  dependencies: [TimeAndDatePlugin, ModActionsPlugin],
  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
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
