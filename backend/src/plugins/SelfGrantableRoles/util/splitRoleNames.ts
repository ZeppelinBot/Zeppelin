export function splitRoleNames(roleNames: string[]) {
  return roleNames
    .map((v) => v.split(/[\s,]+/))
    .flat()
    .filter(Boolean);
}
