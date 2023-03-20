import { GuildRoleQueue } from "../../data/GuildRoleQueue";
import { mapToPublicFn } from "../../pluginUtils";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { addPriorityRole } from "./functions/addPriorityRole";
import { addRole } from "./functions/addRole";
import { removePriorityRole } from "./functions/removePriorityRole";
import { removeRole } from "./functions/removeRole";
import { runRoleAssignmentLoop } from "./functions/runRoleAssignmentLoop";
import { ConfigSchema, RoleManagerPluginType } from "./types";

export const RoleManagerPlugin = zeppelinGuildPlugin<RoleManagerPluginType>()({
  name: "role_manager",
  configSchema: ConfigSchema,
  showInDocs: false,

  dependencies: () => [LogsPlugin],

  public: {
    addRole: mapToPublicFn(addRole),
    removeRole: mapToPublicFn(removeRole),
    addPriorityRole: mapToPublicFn(addPriorityRole),
    removePriorityRole: mapToPublicFn(removePriorityRole),
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

  // FIXME: Proper inherittance from ZeppelinPluginBlueprint
  configParser: (o: any) => o,
});
