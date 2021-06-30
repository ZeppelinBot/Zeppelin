import { Snowflake, TextChannel } from "discord.js";
import { AllowedGuilds } from "../../data/AllowedGuilds";
import { ApiPermissionAssignments } from "../../data/ApiPermissionAssignments";
import { Configs } from "../../data/Configs";
import { GuildArchives } from "../../data/GuildArchives";
import { sendSuccessMessage } from "../../pluginUtils";
import { zeppelinGlobalPlugin } from "../ZeppelinPluginBlueprint";
import { getActiveReload, resetActiveReload } from "./activeReload";
import { AddDashboardUserCmd } from "./commands/AddDashboardUserCmd";
import { AllowServerCmd } from "./commands/AllowServerCmd";
import { DisallowServerCmd } from "./commands/DisallowServerCmd";
import { EligibleCmd } from "./commands/EligibleCmd";
import { LeaveServerCmd } from "./commands/LeaveServerCmd";
import { ListDashboardPermsCmd } from "./commands/ListDashboardPermsCmd";
import { ListDashboardUsersCmd } from "./commands/ListDashboardUsersCmd";
import { ReloadGlobalPluginsCmd } from "./commands/ReloadGlobalPluginsCmd";
import { ReloadServerCmd } from "./commands/ReloadServerCmd";
import { RemoveDashboardUserCmd } from "./commands/RemoveDashboardUserCmd";
import { ServersCmd } from "./commands/ServersCmd";
import { BotControlPluginType, ConfigSchema } from "./types";

const defaultOptions = {
  config: {
    can_use: false,
    can_eligible: false,
    update_cmd: null,
  },
};

export const BotControlPlugin = zeppelinGlobalPlugin<BotControlPluginType>()({
  name: "bot_control",
  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
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
  ],

  async afterLoad(pluginData) {
    pluginData.state.archives = new GuildArchives(0);
    pluginData.state.allowedGuilds = new AllowedGuilds();
    pluginData.state.configs = new Configs();
    pluginData.state.apiPermissionAssignments = new ApiPermissionAssignments();

    const activeReload = getActiveReload();
    if (activeReload) {
      const [guildId, channelId] = activeReload;
      resetActiveReload();

      const guild = await pluginData.client.guilds.fetch(guildId as Snowflake);
      if (guild) {
        const channel = guild.channels.cache.get(channelId as Snowflake);
        if (channel instanceof TextChannel) {
          sendSuccessMessage(pluginData, channel, "Global plugins reloaded!");
        }
      }
    }
  },
});
