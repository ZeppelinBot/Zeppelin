import { guildPlugin } from "knub";
import { GuildRoleQueue } from "../../data/GuildRoleQueue";
import { makePublicFn } from "../../pluginUtils";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { addPriorityRole } from "./functions/addPriorityRole";
import { addRole } from "./functions/addRole";
import { removePriorityRole } from "./functions/removePriorityRole";
import { removeRole } from "./functions/removeRole";
import { runRoleAssignmentLoop } from "./functions/runRoleAssignmentLoop";
import { RoleManagerPluginType, zRoleManagerConfig } from "./types";

export const RoleManagerPlugin = guildPlugin<RoleManagerPluginType>()({
  name: "role_manager",

  dependencies: () => [LogsPlugin],
  configParser: (input) => zRoleManagerConfig.parse(input),

  public(pluginData) {
    return {
      addRole: makePublicFn(pluginData, addRole),
      removeRole: makePublicFn(pluginData, removeRole),
      addPriorityRole: makePublicFn(pluginData, addPriorityRole),
      removePriorityRole: makePublicFn(pluginData, removePriorityRole),
    };
  },

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.roleQueue = GuildRoleQueue.getGuildInstance(guild.id);
    state.pendingRoleAssignmentPromise = Promise.resolve();
  },

  afterLoad(pluginData) {
    runRoleAssignmentLoop(pluginData);
  },

  async afterUnload(pluginData) {
    const { state } = pluginData;

    state.abortRoleAssignmentLoop = true;
    await state.pendingRoleAssignmentPromise;
  },
});
