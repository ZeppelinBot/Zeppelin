import * as t from "io-ts";
import { BasePluginType, command, eventListener } from "knub";

export const ConfigSchema = t.type({
  can_where: t.boolean,
  can_alert: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface LocateUserPluginType extends BasePluginType {
  config: TConfigSchema;
}

export const locateUserCommand = command<LocateUserPluginType>();
export const locateUserEvent = eventListener<LocateUserPluginType>();
