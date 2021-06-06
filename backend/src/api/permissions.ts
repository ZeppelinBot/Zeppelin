import { ApiPermissions, hasPermission, permissionArrToSet } from "@shared/apiPermissions";
import { Request, Response } from "express";
import { ApiPermissionAssignments } from "../data/ApiPermissionAssignments";
import { isStaff } from "../staff";
import { unauthorized } from "./responses";

const apiPermissionAssignments = new ApiPermissionAssignments();

export const hasGuildPermission = async (userId: string, guildId: string, permission: ApiPermissions) => {
  if (isStaff(userId)) {
    return true;
  }

  const permAssignment = await apiPermissionAssignments.getByGuildAndUserId(guildId, userId);
  if (!permAssignment) {
    return false;
  }

  return hasPermission(permissionArrToSet(permAssignment.permissions), permission);
};

/**
 * Requires `guildId` in req.params
 */
export function requireGuildPermission(permission: ApiPermissions) {
  return async (req: Request, res: Response, next) => {
    if (!(await hasGuildPermission(req.user!.userId, req.params.guildId, permission))) {
      return unauthorized(res);
    }

    next();
  };
}
