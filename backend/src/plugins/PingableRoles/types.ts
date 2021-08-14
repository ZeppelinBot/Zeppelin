import * as t from "io-ts";
import { BasePluginType, typedGuildCommand, typedGuildEventListener } from "knub";
import { PingableRole } from "../../data/entities/PingableRole";
import { GuildPingableRoles } from "../../data/GuildPingableRoles";

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

export const pingableRolesCmd = typedGuildCommand<PingableRolesPluginType>();
export const pingableRolesEvt = typedGuildEventListener<PingableRolesPluginType>();
