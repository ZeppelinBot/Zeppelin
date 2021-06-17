import { typedGuildEventListener } from "knub";
import { RecentActionType } from "../constants";
import { runAutomod } from "../functions/runAutomod";
import { AutomodContext, AutomodPluginType } from "../types";

export const RunAutomodOnJoinEvt = typedGuildEventListener<AutomodPluginType>()({
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

export const RunAutomodOnLeaveEvt = typedGuildEventListener<AutomodPluginType>()({
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
