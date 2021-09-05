import { ApiPermissionAssignments } from "../data/ApiPermissionAssignments";
import { MINUTES } from "../utils";

export function startBackgroundTasks() {
  // Clear expired API permissions every minute
  const apiPermissions = new ApiPermissionAssignments();
  setInterval(() => {
    apiPermissions.clearExpiredPermissions();
  }, 1 * MINUTES);
}
