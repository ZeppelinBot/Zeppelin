import { Snowflake } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { selfGrantableRolesCmd } from "../types";
import { findMatchingRoles } from "../util/findMatchingRoles";
import { getApplyingEntries } from "../util/getApplyingEntries";
import { normalizeRoleNames } from "../util/normalizeRoleNames";
import { splitRoleNames } from "../util/splitRoleNames";

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
      id => pluginData.guild.roles.cache.get(id as Snowflake)!,
    );
    const roleIdsToRemove = rolesToRemove.map(r => r.id);

    // Remove the roles
    if (rolesToRemove.length) {
      const newRoleIds = msg.member.roles.cache.filter(role => !roleIdsToRemove.includes(role.id));

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
