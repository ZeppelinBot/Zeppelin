import { selfGrantableRolesCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { getApplyingEntries } from "../util/getApplyingEntries";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { splitRoleNames } from "../util/splitRoleNames";
import { normalizeRoleNames } from "../util/normalizeRoleNames";
import { findMatchingRoles } from "../util/findMatchingRoles";
import { memberRolesLock } from "../../../utils/lockNameHelpers";

export const RoleRemoveCmd = selfGrantableRolesCmd({
  trigger: "role remove",
  permission: null,

  signature: {
    roleNames: ct.string({ rest: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const lock = await pluginData.locks.acquire(memberRolesLock(msg.author));

    const applyingEntries = getApplyingEntries(pluginData, msg);
    if (applyingEntries.length === 0) {
      lock.unlock();
      return;
    }

    const roleNames = normalizeRoleNames(splitRoleNames(args.roleNames));
    const matchedRoleIds = findMatchingRoles(roleNames, applyingEntries);

    const rolesToRemove = Array.from(matchedRoleIds.values()).map(id => pluginData.guild.roles.get(id)!);
    const roleIdsToRemove = rolesToRemove.map(r => r.id);

    // Remove the roles
    if (rolesToRemove.length) {
      const newRoleIds = msg.member.roles.filter(roleId => !roleIdsToRemove.includes(roleId));

      try {
        await msg.member.edit({
          roles: newRoleIds,
        });

        const removedRolesStr = rolesToRemove.map(r => `**${r.name}**`);
        const removedRolesWord = rolesToRemove.length === 1 ? "role" : "roles";

        if (rolesToRemove.length !== roleNames.length) {
          sendSuccessMessage(
            pluginData,
            msg.channel,
            `<@!${msg.author.id}> Removed ${removedRolesStr.join(", ")} ${removedRolesWord};` +
              ` couldn't recognize the other roles you mentioned`,
          );
        } else {
          sendSuccessMessage(
            pluginData,
            msg.channel,
            `<@!${msg.author.id}> Removed ${removedRolesStr.join(", ")} ${removedRolesWord}`,
          );
        }
      } catch {
        sendSuccessMessage(
          pluginData,
          msg.channel,
          `<@!${msg.author.id}> Got an error while trying to remove the roles`,
        );
      }
    } else {
      sendErrorMessage(
        pluginData,
        msg.channel,
        `<@!${msg.author.id}> Unknown ${args.roleNames.length === 1 ? "role" : "roles"}`,
      );
    }

    lock.unlock();
  },
});
