import { typedGuildEventListener } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { RecentActionType } from "../constants";
import { runAutomod } from "../functions/runAutomod";
import isEqual from "lodash.isequal";
import diff from "lodash.difference";

export const RunAutomodOnMemberUpdate = typedGuildEventListener<AutomodPluginType>()({
  event: "guildMemberUpdate",
  listener({ pluginData, args: { oldMember, newMember } }) {
    if (!oldMember) return;

    if (isEqual(oldMember.roles, newMember.roles)) return;

    const addedRoles = diff(newMember.roles, oldMember.roles);
    const removedRoles = diff(oldMember.roles, newMember.roles);

    if (addedRoles.length || removedRoles.length) {
      const context: AutomodContext = {
        timestamp: Date.now(),
        user: newMember.user,
        member: newMember,
        rolesChanged: {
          added: addedRoles,
          removed: removedRoles,
        },
      };

      pluginData.state.queue.add(() => {
        runAutomod(pluginData, context);
      });
    }
  },
});
