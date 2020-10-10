import * as t from "io-ts";
import { tNullable } from "../../utils";
import { BasePluginType, globalCommand, globalEventListener } from "knub";
import { GuildArchives } from "../../data/GuildArchives";
import { AllowedGuilds } from "../../data/AllowedGuilds";
import { ApiPermissionAssignments } from "../../data/ApiPermissionAssignments";

export const ConfigSchema = t.type({
  can_use: t.boolean,
  update_cmd: tNullable(t.string),
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface BotControlPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    archives: GuildArchives;
    allowedGuilds: AllowedGuilds;
    apiPermissionAssignments: ApiPermissionAssignments;
  };
}

export const botControlCmd = globalCommand<BotControlPluginType>();
export const botControlEvt = globalEventListener<BotControlPluginType>();
