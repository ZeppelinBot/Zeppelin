import { BasePluginType } from "knub";
import z from "zod/v4";
import { GuildRoleQueue } from "../../data/GuildRoleQueue.js";

export const zRoleManagerConfig = z.strictObject({});

export interface RoleManagerPluginType extends BasePluginType {
  config: z.infer<typeof zRoleManagerConfig>;
  state: {
    roleQueue: GuildRoleQueue;
    roleAssignmentLoopRunning: boolean;
    abortRoleAssignmentLoop: boolean;
    pendingRoleAssignmentPromise: Promise<unknown>;
  };
}
