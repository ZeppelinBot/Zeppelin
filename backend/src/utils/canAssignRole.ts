import { Constants, Guild, Member, Role } from "eris";
import { getMissingPermissions } from "./getMissingPermissions";
import { hasDiscordPermissions } from "./hasDiscordPermissions";

export function canAssignRole(guild: Guild, member: Member, roleId: string) {
  if (getMissingPermissions(member.permission, Constants.Permissions.manageRoles)) {
    return false;
  }

  if (roleId === guild.id) {
    return false;
  }

  const targetRole = guild.roles.get(roleId);
  if (!targetRole) {
    return false;
  }

  const memberRoles = member.roles.map((_roleId) => guild.roles.get(_roleId)!);
  const highestRoleWithManageRoles = memberRoles.reduce<Role | null>((highest, role) => {
    if (!hasDiscordPermissions(role.permissions, Constants.Permissions.manageRoles)) return highest;
    if (highest == null) return role;
    if (role.position > highest.position) return role;
    return highest;
  }, null);

  return highestRoleWithManageRoles && highestRoleWithManageRoles.position > targetRole.position;
}
