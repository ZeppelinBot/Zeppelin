import { PluginOptions } from "knub";
import { GuildVCAlerts } from "../../data/GuildVCAlerts";
import { trimPluginDescription } from "../../utils";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { FollowCmd } from "./commands/FollowCmd";
import { DeleteFollowCmd, ListFollowCmd } from "./commands/ListFollowCmd";
import { WhereCmd } from "./commands/WhereCmd";
import { GuildBanRemoveAlertsEvt } from "./events/BanRemoveAlertsEvt";
import { VoiceStateUpdateAlertEvt } from "./events/SendAlertsEvts";
import { ConfigSchema, LocateUserPluginType } from "./types";
import { fillActiveAlertsList } from "./utils/fillAlertsList";
import { outdatedAlertsLoop } from "./utils/outdatedLoop";
import Timeout = NodeJS.Timeout;

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

export const LocateUserPlugin = zeppelinGuildPlugin<LocateUserPluginType>()({
  name: "locate_user",
  showInDocs: true,
  info: {
    prettyName: "Locate user",
    description: trimPluginDescription(`
      This plugin allows users with access to the commands the following:
      * Instantly receive an invite to the voice channel of a user
      * Be notified as soon as a user switches or joins a voice channel
    `),
  },

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
    VoiceStateUpdateAlertEvt,
    GuildBanRemoveAlertsEvt
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.alerts = GuildVCAlerts.getGuildInstance(guild.id);
    state.outdatedAlertsTimeout = null;
    state.usersWithAlerts = [];
    state.unloaded = false;
  },

  afterLoad(pluginData) {
    outdatedAlertsLoop(pluginData);
    fillActiveAlertsList(pluginData);
  },

  beforeUnload(pluginData) {
    clearTimeout(pluginData.state.outdatedAlertsTimeout as Timeout);
    pluginData.state.unloaded = true;
  },
});
