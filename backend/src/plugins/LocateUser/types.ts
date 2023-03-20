import * as t from "io-ts";
import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand } from "knub";
import { GuildVCAlerts } from "../../data/GuildVCAlerts";

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

export const locateUserCmd = guildPluginMessageCommand<LocateUserPluginType>();
export const locateUserEvt = guildPluginEventListener<LocateUserPluginType>();
