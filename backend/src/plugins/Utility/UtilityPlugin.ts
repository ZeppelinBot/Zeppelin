import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, UtilityPluginType } from "./types";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildCases } from "../../data/GuildCases";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildArchives } from "../../data/GuildArchives";
import { Supporters } from "../../data/Supporters";
import { ServerInfoCmd } from "./commands/ServerInfoCmd";
import { RolesCmd } from "./commands/RolesCmd";
import { LevelCmd } from "./commands/LevelCmd";
import { SearchCmd } from "./commands/SearchCmd";
import { BanSearchCmd } from "./commands/BanSearchCmd";
import { UserInfoCmd } from "./commands/UserInfoCmd";
import { NicknameResetCmd } from "./commands/NicknameResetCmd";
import { NicknameCmd } from "./commands/NicknameCmd";
import { PingCmd } from "./commands/PingCmd";
import { SourceCmd } from "./commands/SourceCmd";
import { ContextCmd } from "./commands/ContextCmd";
import { VcmoveAllCmd, VcmoveCmd } from "./commands/VcmoveCmd";
import { HelpCmd } from "./commands/HelpCmd";
import { AboutCmd } from "./commands/AboutCmd";
import { PluginOptions } from "knub";
import { activeReloads } from "./guildReloads";
import { sendSuccessMessage } from "../../pluginUtils";
import { ReloadGuildCmd } from "./commands/ReloadGuildCmd";
import { JumboCmd } from "./commands/JumboCmd";
import { AvatarCmd } from "./commands/AvatarCmd";
import { CleanCmd } from "./commands/CleanCmd";
import { InviteInfoCmd } from "./commands/InviteInfoCmd";
import { ChannelInfoCmd } from "./commands/ChannelInfoCmd";
import { MessageInfoCmd } from "./commands/MessageInfoCmd";
import { InfoCmd } from "./commands/InfoCmd";
import { SnowflakeInfoCmd } from "./commands/SnowflakeInfoCmd";
import { discardRegExpRunner, getRegExpRunner } from "../../regExpRunners";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { VcdisconnectCmd } from "./commands/VcdisconnectCmd";
import { ModActionsPlugin } from "../ModActions/ModActionsPlugin";
import { refreshMembersIfNeeded } from "./refreshMembers";
import { RoleInfoCmd } from "./commands/RoleInfoCmd";
import { EmojiInfoCmd } from "./commands/EmojiInfoCmd";

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

export const UtilityPlugin = zeppelinGuildPlugin<UtilityPluginType>()("utility", {
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

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.logs = new GuildLogs(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.archives = GuildArchives.getGuildInstance(guild.id);
    state.supporters = new Supporters();

    state.regexRunner = getRegExpRunner(`guild-${pluginData.guild.id}`);

    state.lastReload = Date.now();

    if (activeReloads.has(guild.id)) {
      sendSuccessMessage(pluginData, activeReloads.get(guild.id)!, "Reloaded!");
      activeReloads.delete(guild.id);
    }

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

  onUnload(pluginData) {
    discardRegExpRunner(`guild-${pluginData.guild.id}`);
  },
});
