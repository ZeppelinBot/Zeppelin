import * as t from "io-ts";
import { BasePluginType, guildCommand, guildEventListener } from "knub";
import { GuildVCAlerts } from "../../data/GuildVCAlerts";
import Timeout = NodeJS.Timeout;

export const ConfigSchema = t.type({
  can_where: t.boolean,
  can_alert: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface LocateUserPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    alerts: GuildVCAlerts;
    outdatedAlertsTimeout: Timeout;
    usersWithAlerts: string[];
    unloaded: boolean;
  };
}

export const locateUserCmd = guildCommand<LocateUserPluginType>();
export const locateUserEvt = guildEventListener<LocateUserPluginType>();
