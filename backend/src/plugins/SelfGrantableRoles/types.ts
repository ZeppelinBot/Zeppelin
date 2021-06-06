import * as t from "io-ts";
import { BasePluginType, CooldownManager, typedGuildCommand } from "knub";

const RoleMap = t.record(t.string, t.array(t.string));

const SelfGrantableRoleEntry = t.type({
  roles: RoleMap,
  can_use: t.boolean,
  can_ignore_cooldown: t.boolean,
  max_roles: t.number,
});
const PartialRoleEntry = t.partial(SelfGrantableRoleEntry.props);
export type TSelfGrantableRoleEntry = t.TypeOf<typeof SelfGrantableRoleEntry>;

export const ConfigSchema = t.type({
  entries: t.record(t.string, SelfGrantableRoleEntry),
  mention_roles: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export const defaultSelfGrantableRoleEntry: t.TypeOf<typeof PartialRoleEntry> = {
  can_use: false,
  can_ignore_cooldown: false,
  max_roles: 0,
};

export interface SelfGrantableRolesPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    cooldowns: CooldownManager;
  };
}

export const selfGrantableRolesCmd = typedGuildCommand<SelfGrantableRolesPluginType>();
