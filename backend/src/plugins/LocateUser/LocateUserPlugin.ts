import { guildPlugin } from "vety";
import { onGuildEvent } from "../../data/GuildEvents.js";
import { GuildVCAlerts } from "../../data/GuildVCAlerts.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { FollowCmd } from "./commands/FollowCmd.js";
import { DeleteFollowCmd, ListFollowCmd } from "./commands/ListFollowCmd.js";
import { WhereCmd } from "./commands/WhereCmd.js";
import { GuildBanRemoveAlertsEvt } from "./events/BanRemoveAlertsEvt.js";
import { VoiceStateUpdateAlertEvt } from "./events/SendAlertsEvts.js";
import { LocateUserPluginType, zLocateUserConfig } from "./types.js";
import { clearExpiredAlert } from "./utils/clearExpiredAlert.js";
import { fillActiveAlertsList } from "./utils/fillAlertsList.js";

export const LocateUserPlugin = guildPlugin<LocateUserPluginType>()({
  name: "locate_user",

  configSchema: zLocateUserConfig,
  defaultOverrides: [
    {
      level: ">=50",
      config: {
        can_where: true,
        can_alert: true,
      },
    },
  ],

  // prettier-ignore
  messageCommands: [
    WhereCmd,
    FollowCmd,
    ListFollowCmd,
    DeleteFollowCmd,
  ],

  // prettier-ignore
  events: [
    VoiceStateUpdateAlertEvt,
    GuildBanRemoveAlertsEvt
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.alerts = GuildVCAlerts.getGuildInstance(guild.id);
    state.usersWithAlerts = [];
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.unregisterGuildEventListener = onGuildEvent(guild.id, "expiredVCAlert", (alert) =>
      clearExpiredAlert(pluginData, alert),
    );
    fillActiveAlertsList(pluginData);
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    state.unregisterGuildEventListener?.();
  },
});
