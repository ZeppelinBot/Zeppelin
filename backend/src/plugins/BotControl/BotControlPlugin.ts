import { Snowflake, TextChannel } from "discord.js";
import { AllowedGuilds } from "../../data/AllowedGuilds";
import { ApiPermissionAssignments } from "../../data/ApiPermissionAssignments";
import { Configs } from "../../data/Configs";
import { GuildArchives } from "../../data/GuildArchives";
import { makeIoTsConfigParser, sendSuccessMessage } from "../../pluginUtils";
import { zeppelinGlobalPlugin } from "../ZeppelinPluginBlueprint";
import { getActiveReload, resetActiveReload } from "./activeReload";
import { AddDashboardUserCmd } from "./commands/AddDashboardUserCmd";
import { AddServerFromInviteCmd } from "./commands/AddServerFromInviteCmd";
import { AllowServerCmd } from "./commands/AllowServerCmd";
import { ChannelToServerCmd } from "./commands/ChannelToServerCmd";
import { DisallowServerCmd } from "./commands/DisallowServerCmd";
import { EligibleCmd } from "./commands/EligibleCmd";
import { LeaveServerCmd } from "./commands/LeaveServerCmd";
import { ListDashboardPermsCmd } from "./commands/ListDashboardPermsCmd";
import { ListDashboardUsersCmd } from "./commands/ListDashboardUsersCmd";
import { ProfilerDataCmd } from "./commands/ProfilerDataCmd";
import { RateLimitPerformanceCmd } from "./commands/RateLimitPerformanceCmd";
import { ReloadGlobalPluginsCmd } from "./commands/ReloadGlobalPluginsCmd";
import { ReloadServerCmd } from "./commands/ReloadServerCmd";
import { RemoveDashboardUserCmd } from "./commands/RemoveDashboardUserCmd";
import { RestPerformanceCmd } from "./commands/RestPerformanceCmd";
import { ServersCmd } from "./commands/ServersCmd";
import { BotControlPluginType, ConfigSchema } from "./types";

const defaultOptions = {
  config: {
    can_use: false,
    can_eligible: false,
    can_performance: false,
    can_add_server_from_invite: false,
    can_list_dashboard_perms: false,
    update_cmd: null,
  },
};

export const BotControlPlugin = zeppelinGlobalPlugin<BotControlPluginType>()({
  name: "bot_control",
  configParser: makeIoTsConfigParser(ConfigSchema),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
    ReloadGlobalPluginsCmd,
    ServersCmd,
    LeaveServerCmd,
    ReloadServerCmd,
    AllowServerCmd,
    DisallowServerCmd,
    AddDashboardUserCmd,
    RemoveDashboardUserCmd,
    ListDashboardUsersCmd,
    ListDashboardPermsCmd,
    EligibleCmd,
    ProfilerDataCmd,
    RestPerformanceCmd,
    RateLimitPerformanceCmd,
    AddServerFromInviteCmd,
    ChannelToServerCmd,
  ],

  async afterLoad(pluginData) {
    const { state, client } = pluginData;

    state.archives = new GuildArchives(0);
    state.allowedGuilds = new AllowedGuilds();
    state.configs = new Configs();
    state.apiPermissionAssignments = new ApiPermissionAssignments();

    const activeReload = getActiveReload();
    if (activeReload) {
      const [guildId, channelId] = activeReload;
      resetActiveReload();

      const guild = await client.guilds.fetch(guildId as Snowflake);
      if (guild) {
        const channel = guild.channels.cache.get(channelId as Snowflake);
        if (channel instanceof TextChannel) {
          sendSuccessMessage(pluginData, channel, "Global plugins reloaded!");
        }
      }
    }
  },
});
