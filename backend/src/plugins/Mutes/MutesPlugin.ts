import { GuildMember, Snowflake } from "discord.js";
import { EventEmitter } from "events";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildMutes } from "../../data/GuildMutes";
import { mapToPublicFn } from "../../pluginUtils";
import { CasesPlugin } from "../Cases/CasesPlugin";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ClearBannedMutesCmd } from "./commands/ClearBannedMutesCmd";
import { ClearMutesCmd } from "./commands/ClearMutesCmd";
import { ClearMutesWithoutRoleCmd } from "./commands/ClearMutesWithoutRoleCmd";
import { MutesCmd } from "./commands/MutesCmd";
import { ClearActiveMuteOnMemberBanEvt } from "./events/ClearActiveMuteOnMemberBanEvt";
import { ClearActiveMuteOnRoleRemovalEvt } from "./events/ClearActiveMuteOnRoleRemovalEvt";
import { ReapplyActiveMuteOnJoinEvt } from "./events/ReapplyActiveMuteOnJoinEvt";
import { clearExpiredMutes } from "./functions/clearExpiredMutes";
import { muteUser } from "./functions/muteUser";
import { offMutesEvent } from "./functions/offMutesEvent";
import { onMutesEvent } from "./functions/onMutesEvent";
import { unmuteUser } from "./functions/unmuteUser";
import { ConfigSchema, MutesPluginType } from "./types";

const defaultOptions = {
  config: {
    mute_role: null,
    move_to_voice_channel: null,
    kick_from_voice_channel: false,

    dm_on_mute: false,
    dm_on_update: false,
    message_on_mute: false,
    message_on_update: false,
    message_channel: null,
    mute_message: "You have been muted on the {guildName} server. Reason given: {reason}",
    timed_mute_message: "You have been muted on the {guildName} server for {time}. Reason given: {reason}",
    update_mute_message: "Your mute on the {guildName} server has been updated to {time}.",
    remove_roles_on_mute: false,
    restore_roles_on_mute: false,

    can_view_list: false,
    can_cleanup: false,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_view_list: true,
      },
    },
    {
      level: ">=100",
      config: {
        can_cleanup: true,
      },
    },
  ],
};

const EXPIRED_MUTE_CHECK_INTERVAL = 60 * 1000;
let FIRST_CHECK_TIME = Date.now();
const FIRST_CHECK_INCREMENT = 5 * 1000;

export const MutesPlugin = zeppelinGuildPlugin<MutesPluginType>()({
  name: "mutes",
  showInDocs: true,
  info: {
    prettyName: "Mutes",
  },

  configSchema: ConfigSchema,
  defaultOptions,

  dependencies: [CasesPlugin, LogsPlugin],

  // prettier-ignore
  commands: [
    MutesCmd,
    ClearBannedMutesCmd,
    ClearMutesWithoutRoleCmd,
    ClearMutesCmd,
  ],

  // prettier-ignore
  events: [
    ClearActiveMuteOnRoleRemovalEvt,
    ClearActiveMuteOnMemberBanEvt,
    ReapplyActiveMuteOnJoinEvt,
  ],

  public: {
    muteUser: mapToPublicFn(muteUser),
    unmuteUser: mapToPublicFn(unmuteUser),
    hasMutedRole(pluginData) {
      return (member: GuildMember) => {
        const muteRole = pluginData.config.get().mute_role;
        return muteRole ? member.roles.cache.has(muteRole as Snowflake) : false;
      };
    },

    on: mapToPublicFn(onMutesEvent),
    off: mapToPublicFn(offMutesEvent),
    getEventEmitter(pluginData) {
      return () => pluginData.state.events;
    },
  },

  beforeLoad(pluginData) {
    pluginData.state.mutes = GuildMutes.getGuildInstance(pluginData.guild.id);
    pluginData.state.cases = GuildCases.getGuildInstance(pluginData.guild.id);
    pluginData.state.serverLogs = new GuildLogs(pluginData.guild.id);
    pluginData.state.archives = GuildArchives.getGuildInstance(pluginData.guild.id);

    pluginData.state.events = new EventEmitter();
  },

  afterLoad(pluginData) {
    // Check for expired mutes every 5s
    const firstCheckTime = Math.max(Date.now(), FIRST_CHECK_TIME) + FIRST_CHECK_INCREMENT;
    FIRST_CHECK_TIME = firstCheckTime;

    setTimeout(() => {
      clearExpiredMutes(pluginData);
      pluginData.state.muteClearIntervalId = setInterval(
        () => clearExpiredMutes(pluginData),
        EXPIRED_MUTE_CHECK_INTERVAL,
      );
    }, firstCheckTime - Date.now());
  },

  beforeUnload(pluginData) {
    clearInterval(pluginData.state.muteClearIntervalId);
    pluginData.state.events.removeAllListeners();
  },
});
