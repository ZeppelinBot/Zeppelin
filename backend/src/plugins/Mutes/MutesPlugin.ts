import { GuildMember, Snowflake } from "discord.js";
import { EventEmitter } from "events";
import { guildPlugin } from "knub";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { onGuildEvent } from "../../data/GuildEvents";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildMutes } from "../../data/GuildMutes";
import { makePublicFn } from "../../pluginUtils";
import { CasesPlugin } from "../Cases/CasesPlugin";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { RoleManagerPlugin } from "../RoleManager/RoleManagerPlugin.js";
import { ClearBannedMutesCmd } from "./commands/ClearBannedMutesCmd";
import { ClearMutesCmd } from "./commands/ClearMutesCmd";
import { ClearMutesWithoutRoleCmd } from "./commands/ClearMutesWithoutRoleCmd";
import { MutesCmd } from "./commands/MutesCmd";
import { ClearActiveMuteOnMemberBanEvt } from "./events/ClearActiveMuteOnMemberBanEvt";
import { ReapplyActiveMuteOnJoinEvt } from "./events/ReapplyActiveMuteOnJoinEvt";
import { RegisterManualTimeoutsEvt } from "./events/RegisterManualTimeoutsEvt";
import { clearMute } from "./functions/clearMute";
import { muteUser } from "./functions/muteUser";
import { offMutesEvent } from "./functions/offMutesEvent";
import { onMutesEvent } from "./functions/onMutesEvent";
import { renewTimeoutMute } from "./functions/renewTimeoutMute";
import { unmuteUser } from "./functions/unmuteUser";
import { MutesPluginType, zMutesConfig } from "./types";

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

export const MutesPlugin = guildPlugin<MutesPluginType>()({
  name: "mutes",

  dependencies: () => [CasesPlugin, LogsPlugin, RoleManagerPlugin],
  configParser: (input) => zMutesConfig.parse(input),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
    MutesCmd,
    ClearBannedMutesCmd,
    ClearMutesWithoutRoleCmd,
    ClearMutesCmd,
  ],

  // prettier-ignore
  events: [
    // ClearActiveMuteOnRoleRemovalEvt, // FIXME: Temporarily disabled for performance
    ClearActiveMuteOnMemberBanEvt,
    ReapplyActiveMuteOnJoinEvt,
    RegisterManualTimeoutsEvt,
  ],

  public(pluginData) {
    return {
      muteUser: makePublicFn(pluginData, muteUser),
      unmuteUser: makePublicFn(pluginData, unmuteUser),
      hasMutedRole: (member: GuildMember) => {
        const muteRole = pluginData.config.get().mute_role;
        return muteRole ? member.roles.cache.has(muteRole as Snowflake) : false;
      },
      on: makePublicFn(pluginData, onMutesEvent),
      off: makePublicFn(pluginData, offMutesEvent),
      getEventEmitter: () => pluginData.state.events,
    };
  },

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.mutes = GuildMutes.getGuildInstance(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);
    state.serverLogs = new GuildLogs(guild.id);
    state.archives = GuildArchives.getGuildInstance(guild.id);

    state.events = new EventEmitter();
  },

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.unregisterExpiredRoleMuteListener = onGuildEvent(guild.id, "expiredMute", (mute) =>
      clearMute(pluginData, mute),
    );
    state.unregisterTimeoutMuteToRenewListener = onGuildEvent(guild.id, "timeoutMuteToRenew", (mute) =>
      renewTimeoutMute(pluginData, mute),
    );

    const muteRole = pluginData.config.get().mute_role;
    if (muteRole) {
      state.mutes.fillMissingMuteRole(muteRole);
    }
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    state.unregisterExpiredRoleMuteListener?.();
    state.unregisterTimeoutMuteToRenewListener?.();
    state.events.removeAllListeners();
  },
});
