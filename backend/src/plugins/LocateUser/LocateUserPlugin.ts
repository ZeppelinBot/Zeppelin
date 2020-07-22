import { PluginOptions } from "knub";
import { LocateUserPluginType, ConfigSchema } from "./types";
import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { GuildVCAlerts } from "src/data/GuildVCAlerts";
import { outdatedAlertsLoop } from "./utils/outdatedLoop";
import { fillActiveAlertsList } from "./utils/fillAlertsList";
import { WhereCmd } from "./commands/WhereCmd";
import { FollowCmd } from "./commands/FollowCmd";
import { ListFollowCmd, DeleteFollowCmd } from "./commands/ListFollowCmd";
import { ChannelJoinAlertsEvt, ChannelSwitchAlertsEvt, ChannelLeaveAlertsEvt } from "./events/SendAlertsEvts";
import { GuildBanRemoveAlertsEvt } from "./events/BanRemoveAlertsEvt";

const defaultOptions: PluginOptions<LocateUserPluginType> = {
  config: {
    can_where: false,
    can_alert: false,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_where: true,
        can_alert: true,
      },
    },
  ],
};

export const LocateUserPlugin = zeppelinPlugin<LocateUserPluginType>()("locate_user", {
  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
    WhereCmd,
    FollowCmd,
    ListFollowCmd,
    DeleteFollowCmd,
  ],

  // prettier-ignore
  events: [
    ChannelJoinAlertsEvt, 
    ChannelSwitchAlertsEvt, 
    ChannelLeaveAlertsEvt, 
    GuildBanRemoveAlertsEvt
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.alerts = GuildVCAlerts.getGuildInstance(guild.id);
    state.outdatedAlertsTimeout = null;
    state.usersWithAlerts = [];
    state.unloaded = false;

    outdatedAlertsLoop(pluginData);
    fillActiveAlertsList(pluginData);
  },

  onUnload(pluginData) {
    clearTimeout(pluginData.state.outdatedAlertsTimeout);
    pluginData.state.unloaded = true;
  },
});
