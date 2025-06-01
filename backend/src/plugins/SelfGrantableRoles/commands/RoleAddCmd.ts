import { Role, Snowflake } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { resolveMessageMember } from "../../../pluginUtils.js";
import { memberRolesLock } from "../../../utils/lockNameHelpers.js";
import { selfGrantableRolesCmd } from "../types.js";
import { findMatchingRoles } from "../util/findMatchingRoles.js";
import { getApplyingEntries } from "../util/getApplyingEntries.js";
import { normalizeRoleNames } from "../util/normalizeRoleNames.js";
import { splitRoleNames } from "../util/splitRoleNames.js";

export const RoleAddCmd = selfGrantableRolesCmd({
  trigger: ["role", "role add"],
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

    const hasUnknownRoles = matchedRoleIds.length !== roleNames.length;

    const rolesToAdd: Map<string, Role> = Array.from(matchedRoleIds.values())
      .map((id) => pluginData.guild.roles.cache.get(id as Snowflake)!)
      .filter(Boolean)
      .reduce((map, role) => {
        map.set(role.id, role);
        return map;
      }, new Map());

    if (!rolesToAdd.size) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        `<@!${msg.author.id}> Unknown ${args.roleNames.length === 1 ? "role" : "roles"}`,
        {
          users: [msg.author.id],
        },
      );
      lock.unlock();
      return;
    }

    const authorMember = await resolveMessageMember(msg);

    // Grant the roles
    const newRoleIds = new Set([...rolesToAdd.keys(), ...authorMember.roles.cache.keys()]);

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

            if (authorMember.roles.cache.has(roleId as Snowflake)) {
              removed.add(pluginData.guild.roles.cache.get(roleId as Snowflake)!);
            } else {
              skipped.add(pluginData.guild.roles.cache.get(roleId as Snowflake)!);
            }
          }
        }
      }
    }

    try {
      await authorMember.edit({
        roles: Array.from(newRoleIds) as Snowflake[],
      });
    } catch {
      void pluginData.state.common.sendErrorMessage(
        msg,
        `<@!${msg.author.id}> Got an error while trying to grant you the roles`,
        {
          users: [msg.author.id],
        },
      );
      return;
    }

    const mentionRoles = pluginData.config.get().mention_roles;
    const addedRolesStr = Array.from(rolesToAdd.values()).map((r) => (mentionRoles ? `<@&${r.id}>` : `**${r.name}**`));
    const addedRolesWord = rolesToAdd.size === 1 ? "role" : "roles";

    const messageParts: string[] = [];
    messageParts.push(`Granted you the ${addedRolesStr.join(", ")} ${addedRolesWord}`);

    if (skipped.size || removed.size) {
      const skippedRolesStr = skipped.size
        ? "skipped " +
          Array.from(skipped.values())
            .map((r) => (mentionRoles ? `<@&${r.id}>` : `**${r.name}**`))
            .join(",")
        : null;
      const removedRolesStr = removed.size
        ? "removed " + Array.from(removed.values()).map((r) => (mentionRoles ? `<@&${r.id}>` : `**${r.name}**`))
        : null;

      const skippedRemovedStr = [skippedRolesStr, removedRolesStr].filter(Boolean).join(" and ");

      messageParts.push(`${skippedRemovedStr} due to role limits`);
    }

    if (hasUnknownRoles) {
      messageParts.push("couldn't recognize some of the roles");
    }

    void pluginData.state.common.sendSuccessMessage(msg, `<@!${msg.author.id}> ${messageParts.join("; ")}`, {
      users: [msg.author.id],
    });

    lock.unlock();
  },
});
