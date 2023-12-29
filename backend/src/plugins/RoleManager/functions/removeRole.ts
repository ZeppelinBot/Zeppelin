import { GuildPluginData } from "knub";
import { RoleManagerPluginType } from "../types";
import { runRoleAssignmentLoop } from "./runRoleAssignmentLoop";

export async function removeRole(pluginData: GuildPluginData<RoleManagerPluginType>, userId: string, roleId: string) {
  await pluginData.state.roleQueue.addQueueItem(userId, roleId, false);
  runRoleAssignmentLoop(pluginData);
}
