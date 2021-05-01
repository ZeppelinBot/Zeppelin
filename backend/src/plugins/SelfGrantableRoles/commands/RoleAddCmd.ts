import { selfGrantableRolesCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { getApplyingEntries } from "../util/getApplyingEntries";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { splitRoleNames } from "../util/splitRoleNames";
import { normalizeRoleNames } from "../util/normalizeRoleNames";
import { findMatchingRoles } from "../util/findMatchingRoles";
import { Role } from "eris";
import { memberRolesLock } from "../../../utils/lockNameHelpers";

export const RoleAddCmd = selfGrantableRolesCmd({
  trigger: ["role", "role add"],
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

    const hasUnknownRoles = matchedRoleIds.length !== roleNames.length;

    const rolesToAdd: Map<string, Role> = Array.from(matchedRoleIds.values())
      .map(id => pluginData.guild.roles.get(id)!)
      .filter(Boolean)
      .reduce((map, role) => {
        map.set(role.id, role);
        return map;
      }, new Map());

    if (!rolesToAdd.size) {
      sendErrorMessage(
        pluginData,
        msg.channel,
        `<@!${msg.author.id}> Unknown ${args.roleNames.length === 1 ? "role" : "roles"}`,
      );
      lock.unlock();
      return;
    }

    // Grant the roles
    const newRoleIds = new Set([...rolesToAdd.keys(), ...msg.member.roles]);

    // Remove extra roles (max_roles) for each entry
    const skipped: Set<Role> = new Set();
    const removed: Set<Role> = new Set();

    for (const entry of applyingEntries) {
      if (entry.max_roles === 0) continue;

      let foundRoles = 0;

      for (const roleId of newRoleIds) {
        if (entry.roles[roleId]) {
          if (foundRoles < entry.max_roles) {
            foundRoles++;
          } else {
            newRoleIds.delete(roleId);
            rolesToAdd.delete(roleId);

            if (msg.member.roles.includes(roleId)) {
              removed.add(pluginData.guild.roles.get(roleId)!);
            } else {
              skipped.add(pluginData.guild.roles.get(roleId)!);
            }
          }
        }
      }
    }

    try {
      await msg.member.edit({
        roles: Array.from(newRoleIds),
      });
    } catch {
      sendErrorMessage(
        pluginData,
        msg.channel,
        `<@!${msg.author.id}> Got an error while trying to grant you the roles`,
      );
      return;
    }

    const mentionRoles = pluginData.config.get().mention_roles;
    const addedRolesStr = Array.from(rolesToAdd.values()).map(r => (mentionRoles ? `<@&${r.id}>` : `**${r.name}**`));
    const addedRolesWord = rolesToAdd.size === 1 ? "role" : "roles";

    const messageParts: string[] = [];
    messageParts.push(`Granted you the ${addedRolesStr.join(", ")} ${addedRolesWord}`);

    if (skipped.size || removed.size) {
      const skippedRolesStr = skipped.size
        ? "skipped " +
          Array.from(skipped.values())
            .map(r => (mentionRoles ? `<@&${r.id}>` : `**${r.name}**`))
            .join(",")
        : null;
      const removedRolesStr = removed.size
        ? "removed " + Array.from(removed.values()).map(r => (mentionRoles ? `<@&${r.id}>` : `**${r.name}**`))
        : null;

      const skippedRemovedStr = [skippedRolesStr, removedRolesStr].filter(Boolean).join(" and ");

      messageParts.push(`${skippedRemovedStr} due to role limits`);
    }

    if (hasUnknownRoles) {
      messageParts.push("couldn't recognize some of the roles");
    }

    sendSuccessMessage(pluginData, msg.channel, `<@!${msg.author.id}> ${messageParts.join("; ")}`);

    lock.unlock();
  },
});
