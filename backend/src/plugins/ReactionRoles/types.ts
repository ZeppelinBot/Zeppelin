import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { Queue } from "../../Queue.js";
import { GuildReactionRoles } from "../../data/GuildReactionRoles.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

const MIN_AUTO_REFRESH = 1000 * 60 * 15; // 15min minimum, let's not abuse the API

export const zReactionRolesConfig = z.strictObject({
  auto_refresh_interval: z.number().min(MIN_AUTO_REFRESH).default(MIN_AUTO_REFRESH),
  remove_user_reactions: z.boolean().default(true),
  can_manage: z.boolean().default(false),
  button_groups: z.null().default(null),
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
  configSchema: typeof zReactionRolesConfig;
  state: {
    reactionRoles: GuildReactionRoles;
    savedMessages: GuildSavedMessages;

    reactionRemoveQueue: Queue;
    roleChangeQueue: Queue;
    pendingRoleChanges: Map<string, PendingMemberRoleChanges>;
    pendingRefreshes: Set<string>;

    autoRefreshTimeout: NodeJS.Timeout;

    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const reactionRolesCmd = guildPluginMessageCommand<ReactionRolesPluginType>();
export const reactionRolesEvt = guildPluginEventListener<ReactionRolesPluginType>();
