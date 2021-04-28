import { zeppelinGlobalPlugin } from "../ZeppelinPluginBlueprint";
import { BotControlPluginType, ConfigSchema } from "./types";
import { GuildArchives } from "../../data/GuildArchives";
import { TextChannel } from "eris";
import { sendSuccessMessage } from "../../pluginUtils";
import { getActiveReload, resetActiveReload } from "./activeReload";
import { ReloadGlobalPluginsCmd } from "./commands/ReloadGlobalPluginsCmd";
import { ServersCmd } from "./commands/ServersCmd";
import { LeaveServerCmd } from "./commands/LeaveServerCmd";
import { ReloadServerCmd } from "./commands/ReloadServerCmd";
import { AllowedGuilds } from "../../data/AllowedGuilds";
import { AllowServerCmd } from "./commands/AllowServerCmd";
import { DisallowServerCmd } from "./commands/DisallowServerCmd";
import { AddDashboardUserCmd } from "./commands/AddDashboardUserCmd";
import { RemoveDashboardUserCmd } from "./commands/RemoveDashboardUserCmd";
import { Configs } from "../../data/Configs";
import { ApiPermissionAssignments } from "../../data/ApiPermissionAssignments";
import { ListDashboardUsersCmd } from "./commands/ListDashboardUsersCmd";
import { ListDashboardPermsCmd } from "./commands/ListDashboardPermsCmd";
import { EligibleCmd } from "./commands/EligibleCmd";

const defaultOptions = {
  config: {
    can_use: false,
    can_eligible: false,
    update_cmd: null,
  },
};

export const BotControlPlugin = zeppelinGlobalPlugin<BotControlPluginType>()("bot_control", {
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

  onLoad(pluginData) {
    pluginData.state.archives = new GuildArchives(0);
    pluginData.state.allowedGuilds = new AllowedGuilds();
    pluginData.state.configs = new Configs();
    pluginData.state.apiPermissionAssignments = new ApiPermissionAssignments();

    const activeReload = getActiveReload();
    if (activeReload) {
      const [guildId, channelId] = activeReload;
      resetActiveReload();

      const guild = pluginData.client.guilds.get(guildId);
      if (guild) {
        const channel = guild.channels.get(channelId);
        if (channel instanceof TextChannel) {
          sendSuccessMessage(pluginData, channel, "Global plugins reloaded!");
        }
      }
    }
  },
});
