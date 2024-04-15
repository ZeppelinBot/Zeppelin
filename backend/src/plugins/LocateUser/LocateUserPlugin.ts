import { PluginOptions, guildPlugin } from "knub";
import { onGuildEvent } from "../../data/GuildEvents";
import { GuildVCAlerts } from "../../data/GuildVCAlerts";
import { FollowCmd } from "./commands/FollowCmd";
import { DeleteFollowCmd, ListFollowCmd } from "./commands/ListFollowCmd";
import { WhereCmd } from "./commands/WhereCmd";
import { GuildBanRemoveAlertsEvt } from "./events/BanRemoveAlertsEvt";
import { VoiceStateUpdateAlertEvt } from "./events/SendAlertsEvts";
import { LocateUserPluginType, zLocateUserConfig } from "./types";
import { clearExpiredAlert } from "./utils/clearExpiredAlert";
import { fillActiveAlertsList } from "./utils/fillAlertsList";
import { CommonPlugin } from "../Common/CommonPlugin";

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

export const LocateUserPlugin = guildPlugin<LocateUserPluginType>()({
  name: "locate_user",

  configParser: (input) => zLocateUserConfig.parse(input),
  defaultOptions,

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
