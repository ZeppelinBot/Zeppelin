import * as t from "io-ts";
import { BasePluginType, globalPluginEventListener, globalPluginMessageCommand } from "knub";
import { AllowedGuilds } from "../../data/AllowedGuilds";
import { ApiPermissionAssignments } from "../../data/ApiPermissionAssignments";
import { Configs } from "../../data/Configs";
import { GuildArchives } from "../../data/GuildArchives";
import { tNullable } from "../../utils";

export const ConfigSchema = t.type({
  can_use: t.boolean,
  can_eligible: t.boolean,
  can_performance: t.boolean,
  can_add_server_from_invite: t.boolean,
  can_list_dashboard_perms: t.boolean,
  update_cmd: tNullable(t.string),
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface BotControlPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    archives: GuildArchives;
    allowedGuilds: AllowedGuilds;
    apiPermissionAssignments: ApiPermissionAssignments;
    configs: Configs;
  };
}

export const botControlCmd = globalPluginMessageCommand<BotControlPluginType>();
export const botControlEvt = globalPluginEventListener<BotControlPluginType>();
