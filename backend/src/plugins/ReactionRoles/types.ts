import * as t from "io-ts";
import { BasePluginType, eventListener, command, PluginData } from "knub";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildReactionRoles } from "src/data/GuildReactionRoles";
import { Queue } from "src/Queue";

export const ConfigSchema = t.type({
  auto_refresh_interval: t.number,
  can_manage: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export type RoleChangeMode = "+" | "-";

export type PendingMemberRoleChanges = {
  timeout: NodeJS.Timeout;
  applyFn: () => void;
  changes: Array<{
    mode: RoleChangeMode;
    roleId: string;
  }>;
};

const ReactionRolePair = t.union([t.tuple([t.string, t.string, t.string]), t.tuple([t.string, t.string])]);
export type TReactionRolePair = t.TypeOf<typeof ReactionRolePair>;
type ReactionRolePair = [string, string, string?];

export interface ReactionRolesPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    reactionRoles: GuildReactionRoles;
    savedMessages: GuildSavedMessages;

    reactionRemoveQueue: Queue;
    roleChangeQueue: Queue;
    pendingRoleChanges: Map<string, PendingMemberRoleChanges>;
    pendingRefreshes: Set<string>;

    autoRefreshTimeout: NodeJS.Timeout;
  };
}

export const reactionRolesCmd = command<ReactionRolesPluginType>();
export const reactionRolesEvent = eventListener<ReactionRolesPluginType>();
