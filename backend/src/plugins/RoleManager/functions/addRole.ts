import { GuildPluginData } from "knub";
import { RoleManagerPluginType } from "../types.js";
import { runRoleAssignmentLoop } from "./runRoleAssignmentLoop.js";

export async function addRole(pluginData: GuildPluginData<RoleManagerPluginType>, userId: string, roleId: string) {
  await pluginData.state.roleQueue.addQueueItem(userId, roleId, true);
  runRoleAssignmentLoop(pluginData);
}
