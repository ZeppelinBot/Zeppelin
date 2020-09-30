import * as t from "io-ts";
import { BasePluginType, guildCommand, guildEventListener } from "knub";
import { GuildPingableRoles } from "../../data/GuildPingableRoles";
import { PingableRole } from "../../data/entities/PingableRole";

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

export const pingableRolesCmd = guildCommand<PingableRolesPluginType>();
export const pingableRolesEvt = guildEventListener<PingableRolesPluginType>();
