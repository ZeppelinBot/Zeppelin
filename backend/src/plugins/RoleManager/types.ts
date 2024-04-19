import { BasePluginType } from "knub";
import z from "zod";
import { GuildRoleQueue } from "../../data/GuildRoleQueue";

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
