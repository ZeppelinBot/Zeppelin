import * as t from "io-ts";
import { BasePluginType, eventListener, command } from "knub";
import { GuildPingableRoles } from "src/data/GuildPingableRoles";
import { PingableRole } from "src/data/entities/PingableRole";

export const ConfigSchema = t.type({
  can_manage: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface PingableRolesPluginType extends BasePluginType {
  config: TConfigSchema;

  state: {
    pingableRoles: GuildPingableRoles;
    cache: Map<string, PingableRole[]>;
    timeouts: Map<string, any>;
  };
}

export const pingableRolesCmd = command<PingableRolesPluginType>();
export const pingableRolesEvt = eventListener<PingableRolesPluginType>();
