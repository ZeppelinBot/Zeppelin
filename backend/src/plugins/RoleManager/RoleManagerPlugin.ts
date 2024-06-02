import { guildPlugin } from "knub";
import { GuildRoleQueue } from "../../data/GuildRoleQueue.js";
import { makePublicFn } from "../../pluginUtils.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { addPriorityRole } from "./functions/addPriorityRole.js";
import { addRole } from "./functions/addRole.js";
import { removePriorityRole } from "./functions/removePriorityRole.js";
import { removeRole } from "./functions/removeRole.js";
import { runRoleAssignmentLoop } from "./functions/runRoleAssignmentLoop.js";
import { RoleManagerPluginType, zRoleManagerConfig } from "./types.js";

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
