import { GuildPluginData } from "knub";
import { PRIORITY_ROLE_PRIORITY } from "../constants.js";
import { RoleManagerPluginType } from "../types.js";
import { runRoleAssignmentLoop } from "./runRoleAssignmentLoop.js";

export async function removePriorityRole(
  pluginData: GuildPluginData<RoleManagerPluginType>,
  userId: string,
  roleId: string,
) {
  await pluginData.state.roleQueue.addQueueItem(userId, roleId, false, PRIORITY_ROLE_PRIORITY);
  runRoleAssignmentLoop(pluginData);
}
