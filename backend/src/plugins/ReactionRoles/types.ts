import * as t from "io-ts";
import { BasePluginType, guildEventListener, guildCommand } from "knub";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildReactionRoles } from "../../data/GuildReactionRoles";
import { Queue } from "../../Queue";

export const ConfigSchema = t.type({
  auto_refresh_interval: t.number,
  remove_user_reactions: t.boolean,
  can_manage: t.boolean,
  dm_on_change: t.boolean,
  change_message: t.string,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export type RoleChangeMode = "+" | "-";

export type PendingMemberRoleChanges = {
  timeout: NodeJS.Timeout | null;
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

export const reactionRolesCmd = guildCommand<ReactionRolesPluginType>();
export const reactionRolesEvt = guildEventListener<ReactionRolesPluginType>();
