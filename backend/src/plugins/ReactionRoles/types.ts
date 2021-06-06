import * as t from "io-ts";
import { BasePluginType, typedGuildEventListener, typedGuildCommand } from "knub";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildReactionRoles } from "../../data/GuildReactionRoles";
import { Queue } from "../../Queue";

const ButtonOpts = t.type({
  label: t.string,
  emoji: t.string,
  role_or_menu: t.string,
});
export type TButtonOpts = t.TypeOf<typeof ButtonOpts>;

const MenuButtonOpts = t.type({
  label: t.string,
  emoji: t.string,
  role: t.string,
});
export type TMenuButtonOpts = t.TypeOf<typeof MenuButtonOpts>;

const ButtonPairOpts = t.type({
  channel_id: t.string,
  message: t.string,
  default_buttons: t.record(t.string, ButtonOpts),
  button_menus: t.record(t.string, t.record(t.string, MenuButtonOpts)),
});
export type TButtonPairOpts = t.TypeOf<typeof ButtonPairOpts>;

export const ConfigSchema = t.type({
  button_groups: t.record(t.string, ButtonPairOpts),
  auto_refresh_interval: t.number,
  remove_user_reactions: t.boolean,
  can_manage: t.boolean,
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

export const reactionRolesCmd = typedGuildCommand<ReactionRolesPluginType>();
export const reactionRolesEvt = typedGuildEventListener<ReactionRolesPluginType>();
