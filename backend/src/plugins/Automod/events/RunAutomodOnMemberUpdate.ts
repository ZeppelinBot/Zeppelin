import { guildEventListener } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { RecentActionType } from "../constants";
import { runAutomod } from "../functions/runAutomod";
import isEqual from "lodash.isequal";
import diff from "lodash.difference";

export const RunAutomodOnMemberUpdate = guildEventListener<AutomodPluginType>()(
  "guildMemberUpdate",
  ({ pluginData, args: { member, oldMember } }) => {
    if (!oldMember) return;

    if (isEqual(oldMember.roles, member.roles)) return;

    const addedRoles = diff(member.roles, oldMember.roles);
    const removedRoles = diff(oldMember.roles, member.roles);

    if (addedRoles.length || removedRoles.length) {
      const context: AutomodContext = {
        timestamp: Date.now(),
        user: member.user,
        member,
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
);
