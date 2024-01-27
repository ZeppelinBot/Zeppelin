import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand } from "knub";
import z from "zod";
import { Queue } from "../../Queue";
import { GuildReactionRoles } from "../../data/GuildReactionRoles";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";

export const zReactionRolesConfig = z.strictObject({
  auto_refresh_interval: z.number(),
  remove_user_reactions: z.boolean(),
  can_manage: z.boolean(),
  button_groups: z.nullable(z.unknown()),
});

export type RoleChangeMode = "+" | "-";

export type PendingMemberRoleChanges = {
  timeout: NodeJS.Timeout | null;
  applyFn: () => void;
  changes: Array<{
    mode: RoleChangeMode;
    roleId: string;
  }>;
};

const zReactionRolePair = z.union([z.tuple([z.string(), z.string(), z.string()]), z.tuple([z.string(), z.string()])]);
export type TReactionRolePair = z.infer<typeof zReactionRolePair>;

export interface ReactionRolesPluginType extends BasePluginType {
  config: z.infer<typeof zReactionRolesConfig>;
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

export const reactionRolesCmd = guildPluginMessageCommand<ReactionRolesPluginType>();
export const reactionRolesEvt = guildPluginEventListener<ReactionRolesPluginType>();
