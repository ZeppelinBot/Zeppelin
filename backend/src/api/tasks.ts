import { ApiPermissionAssignments } from "../data/ApiPermissionAssignments.js";
import { MINUTES } from "../utils.js";

export function startBackgroundTasks() {
  // Clear expired API permissions every minute
  const apiPermissions = new ApiPermissionAssignments();
  setInterval(() => {
    apiPermissions.clearExpiredPermissions();
  }, 1 * MINUTES);
}
