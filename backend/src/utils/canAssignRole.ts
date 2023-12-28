import { Guild, GuildMember, PermissionsBitField, Role, Snowflake } from "discord.js";
import { getMissingPermissions } from "./getMissingPermissions";
import { hasDiscordPermissions } from "./hasDiscordPermissions";

export function canAssignRole(guild: Guild, member: GuildMember, roleId: string) {
  if (getMissingPermissions(member.permissions, PermissionsBitField.Flags.ManageRoles)) {
    return false;
  }

  if (roleId === guild.id) {
    return false;
  }

  const targetRole = guild.roles.cache.get(roleId as Snowflake);
  if (!targetRole) {
    return false;
  }

  const memberRoles = member.roles.cache;
  const highestRoleWithManageRoles = memberRoles.reduce<Role | null>((highest, role) => {
    if (!hasDiscordPermissions(role.permissions, PermissionsBitField.Flags.ManageRoles)) return highest;
    if (highest == null) return role;
    if (role.position > highest.position) return role;
    return highest;
  }, null);

  return highestRoleWithManageRoles && highestRoleWithManageRoles.position > targetRole.position;
}
