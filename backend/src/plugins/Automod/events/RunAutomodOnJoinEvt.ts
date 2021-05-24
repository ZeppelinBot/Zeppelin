import { typedGuildEventListener } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { runAutomod } from "../functions/runAutomod";
import { RecentActionType } from "../constants";

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
