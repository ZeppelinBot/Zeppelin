import { GuildMember, Snowflake } from "discord.js";
import { EventEmitter } from "events";
import { guildPlugin } from "vety";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildCases } from "../../data/GuildCases.js";
import { onGuildEvent } from "../../data/GuildEvents.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildMutes } from "../../data/GuildMutes.js";
import { makePublicFn } from "../../pluginUtils.js";
import { CasesPlugin } from "../Cases/CasesPlugin.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { RoleManagerPlugin } from "../RoleManager/RoleManagerPlugin.js";
import { ClearBannedMutesCmd } from "./commands/ClearBannedMutesCmd.js";
import { ClearMutesCmd } from "./commands/ClearMutesCmd.js";
import { ClearMutesWithoutRoleCmd } from "./commands/ClearMutesWithoutRoleCmd.js";
import { MutesCmd } from "./commands/MutesCmd.js";
import { ClearActiveMuteOnMemberBanEvt } from "./events/ClearActiveMuteOnMemberBanEvt.js";
import { ReapplyActiveMuteOnJoinEvt } from "./events/ReapplyActiveMuteOnJoinEvt.js";
import { RegisterManualTimeoutsEvt } from "./events/RegisterManualTimeoutsEvt.js";
import { clearMute } from "./functions/clearMute.js";
import { muteUser } from "./functions/muteUser.js";
import { offMutesEvent } from "./functions/offMutesEvent.js";
import { onMutesEvent } from "./functions/onMutesEvent.js";
import { renewTimeoutMute } from "./functions/renewTimeoutMute.js";
import { unmuteUser } from "./functions/unmuteUser.js";
import { MutesPluginType, zMutesConfig } from "./types.js";

export const MutesPlugin = guildPlugin<MutesPluginType>()({
  name: "mutes",

  dependencies: () => [CasesPlugin, LogsPlugin, RoleManagerPlugin],
  configSchema: zMutesConfig,
  defaultOverrides: [
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

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
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
