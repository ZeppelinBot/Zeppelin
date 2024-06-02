import { Snowflake, TextChannel } from "discord.js";
import { globalPlugin } from "knub";
import { AllowedGuilds } from "../../data/AllowedGuilds.js";
import { ApiPermissionAssignments } from "../../data/ApiPermissionAssignments.js";
import { Configs } from "../../data/Configs.js";
import { GuildArchives } from "../../data/GuildArchives.js";
import { sendSuccessMessage } from "../../pluginUtils.js";
import { getActiveReload, resetActiveReload } from "./activeReload.js";
import { AddDashboardUserCmd } from "./commands/AddDashboardUserCmd.js";
import { AddServerFromInviteCmd } from "./commands/AddServerFromInviteCmd.js";
import { AllowServerCmd } from "./commands/AllowServerCmd.js";
import { ChannelToServerCmd } from "./commands/ChannelToServerCmd.js";
import { DisallowServerCmd } from "./commands/DisallowServerCmd.js";
import { EligibleCmd } from "./commands/EligibleCmd.js";
import { LeaveServerCmd } from "./commands/LeaveServerCmd.js";
import { ListDashboardPermsCmd } from "./commands/ListDashboardPermsCmd.js";
import { ListDashboardUsersCmd } from "./commands/ListDashboardUsersCmd.js";
import { ProfilerDataCmd } from "./commands/ProfilerDataCmd.js";
import { RateLimitPerformanceCmd } from "./commands/RateLimitPerformanceCmd.js";
import { ReloadGlobalPluginsCmd } from "./commands/ReloadGlobalPluginsCmd.js";
import { ReloadServerCmd } from "./commands/ReloadServerCmd.js";
import { RemoveDashboardUserCmd } from "./commands/RemoveDashboardUserCmd.js";
import { RestPerformanceCmd } from "./commands/RestPerformanceCmd.js";
import { ServersCmd } from "./commands/ServersCmd.js";
import { BotControlPluginType, zBotControlConfig } from "./types.js";

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

export const BotControlPlugin = globalPlugin<BotControlPluginType>()({
  name: "bot_control",
  configParser: (input) => zBotControlConfig.parse(input),
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
