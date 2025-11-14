import { guildPluginEventListener } from "vety";
import { RecentActionType } from "../constants.js";
import { runAutomod } from "../functions/runAutomod.js";
import { AutomodContext, AutomodPluginType } from "../types.js";

export const RunAutomodOnJoinEvt = guildPluginEventListener<AutomodPluginType>()({
  event: "guildMemberAdd",
  listener({ pluginData, args: { member } }) {
    const context: AutomodContext = {
      timestamp: Date.now(),
      user: member.user,
      member,
      joined: true,
    };

    pluginData.state.queue.add(() => {
      pluginData.state.recentActions.push({
        type: RecentActionType.MemberJoin,
        context,
        count: 1,
        identifier: null,
      });

      runAutomod(pluginData, context);
    });
  },
});

export const RunAutomodOnLeaveEvt = guildPluginEventListener<AutomodPluginType>()({
  event: "guildMemberRemove",
  listener({ pluginData, args: { member } }) {
    const context: AutomodContext = {
      timestamp: Date.now(),
      partialMember: member,
      joined: true,
    };

    pluginData.state.queue.add(() => {
      pluginData.state.recentActions.push({
        type: RecentActionType.MemberLeave,
        context,
        count: 1,
        identifier: null,
      });

      runAutomod(pluginData, context);
    });
  },
});
