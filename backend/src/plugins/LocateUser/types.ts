import * as t from "io-ts";
import { BasePluginType, typedGuildCommand, typedGuildEventListener } from "knub";
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
    usersWithAlerts: string[];
    unregisterGuildEventListener: () => void;
  };
}

export const locateUserCmd = typedGuildCommand<LocateUserPluginType>();
export const locateUserEvt = typedGuildEventListener<LocateUserPluginType>();
