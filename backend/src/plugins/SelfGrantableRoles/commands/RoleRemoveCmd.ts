import { Snowflake } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { resolveMessageMember } from "../../../pluginUtils.js";
import { memberRolesLock } from "../../../utils/lockNameHelpers.js";
import { selfGrantableRolesCmd } from "../types.js";
import { findMatchingRoles } from "../util/findMatchingRoles.js";
import { getApplyingEntries } from "../util/getApplyingEntries.js";
import { normalizeRoleNames } from "../util/normalizeRoleNames.js";
import { splitRoleNames } from "../util/splitRoleNames.js";

export const RoleRemoveCmd = selfGrantableRolesCmd({
  trigger: "role remove",
  permission: null,

  signature: {
    roleNames: ct.string({ rest: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const lock = await pluginData.locks.acquire(memberRolesLock(msg.author));

    const applyingEntries = await getApplyingEntries(pluginData, msg);
    if (applyingEntries.length === 0) {
      lock.unlock();
      return;
    }

    const roleNames = normalizeRoleNames(splitRoleNames(args.roleNames));
    const matchedRoleIds = findMatchingRoles(roleNames, applyingEntries);

    const rolesToRemove = Array.from(matchedRoleIds.values()).map(
      (id) => pluginData.guild.roles.cache.get(id as Snowflake)!,
    );
    const roleIdsToRemove = rolesToRemove.map((r) => r.id);

    const authorMember = await resolveMessageMember(msg);

    // Remove the roles
    if (rolesToRemove.length) {
      const newRoleIds = authorMember.roles.cache.filter((role) => !roleIdsToRemove.includes(role.id));

      try {
        await authorMember.edit({
          roles: newRoleIds,
        });

        const removedRolesStr = rolesToRemove.map((r) => `**${r.name}**`);
        const removedRolesWord = rolesToRemove.length === 1 ? "role" : "roles";

        if (rolesToRemove.length !== roleNames.length) {
          void pluginData.state.common.sendSuccessMessage(
            msg,
            `<@!${msg.author.id}> Removed ${removedRolesStr.join(", ")} ${removedRolesWord};` +
              ` couldn't recognize the other roles you mentioned`,
            { users: [msg.author.id] },
          );
        } else {
          void pluginData.state.common.sendSuccessMessage(
            msg,
            `<@!${msg.author.id}> Removed ${removedRolesStr.join(", ")} ${removedRolesWord}`,
            {
              users: [msg.author.id],
            },
          );
        }
      } catch {
        void pluginData.state.common.sendSuccessMessage(
          msg,
          `<@!${msg.author.id}> Got an error while trying to remove the roles`,
          {
            users: [msg.author.id],
          },
        );
      }
    } else {
      void pluginData.state.common.sendErrorMessage(
        msg,
        `<@!${msg.author.id}> Unknown ${args.roleNames.length === 1 ? "role" : "roles"}`,
        {
          users: [msg.author.id],
        },
      );
    }

    lock.unlock();
  },
});
