import { GuildPluginData } from "knub";
import { RoleManagerPluginType } from "../types";
import { runRoleAssignmentLoop } from "./runRoleAssignmentLoop";

export async function addRole(pluginData: GuildPluginData<RoleManagerPluginType>, userId: string, roleId: string) {
  await pluginData.state.roleQueue.addQueueItem(userId, roleId, true);
  runRoleAssignmentLoop(pluginData);
}
