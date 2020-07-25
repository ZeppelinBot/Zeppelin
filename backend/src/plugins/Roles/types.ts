import * as t from "io-ts";
import { BasePluginType, eventListener, command } from "knub";
import { GuildLogs } from "src/data/GuildLogs";

export const ConfigSchema = t.type({
  can_assign: t.boolean,
  can_mass_assign: t.boolean,
  assignable_roles: t.array(t.string),
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface RolesPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    logs: GuildLogs;
  };
}

export const rolesCmd = command<RolesPluginType>();
