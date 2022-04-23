import * as t from "io-ts";
import { BasePluginType, typedGuildCommand } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildRoleQueue } from "../../data/GuildRoleQueue";

export const ConfigSchema = t.type({});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface RoleManagerPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    roleQueue: GuildRoleQueue;
    roleAssignmentLoopRunning: boolean;
    abortRoleAssignmentLoop: boolean;
    pendingRoleAssignmentPromise: Promise<unknown>;
  };
}
