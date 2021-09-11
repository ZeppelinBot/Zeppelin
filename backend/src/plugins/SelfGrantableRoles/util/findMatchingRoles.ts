import { TSelfGrantableRoleEntry } from "../types";

export function findMatchingRoles(roleNames: string[], entries: TSelfGrantableRoleEntry[]): string[] {
  const aliasToRoleId = entries.reduce((map, entry) => {
    for (const [roleId, aliases] of Object.entries(entry.roles)) {
      for (const alias of aliases) {
        map.set(alias, roleId);
      }
    }

    return map;
  }, new Map());

  return roleNames.map((roleName) => aliasToRoleId.get(roleName)).filter(Boolean);
}
