import { GuildPluginData } from "vety";
import { RoleManagerPluginType } from "../types.js";
import { runRoleAssignmentLoop } from "./runRoleAssignmentLoop.js";

export async function removeRole(pluginData: GuildPluginData<RoleManagerPluginType>, userId: string, roleId: string) {
  await pluginData.state.roleQueue.addQueueItem(userId, roleId, false);
  runRoleAssignmentLoop(pluginData);
}
