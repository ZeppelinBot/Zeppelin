import { BasePluginType, globalPluginEventListener, globalPluginMessageCommand, pluginUtils } from "knub";
import z from "zod";
import { AllowedGuilds } from "../../data/AllowedGuilds";
import { ApiPermissionAssignments } from "../../data/ApiPermissionAssignments";
import { Configs } from "../../data/Configs";
import { GuildArchives } from "../../data/GuildArchives";
import { zBoundedCharacters } from "../../utils";

export const zBotControlConfig = z.strictObject({
  can_use: z.boolean(),
  can_eligible: z.boolean(),
  can_performance: z.boolean(),
  can_add_server_from_invite: z.boolean(),
  can_list_dashboard_perms: z.boolean(),
  update_cmd: zBoundedCharacters(0, 2000).nullable(),
});

export interface BotControlPluginType extends BasePluginType {
  config: z.output<typeof zBotControlConfig>;
  state: {
    archives: GuildArchives;
    allowedGuilds: AllowedGuilds;
    apiPermissionAssignments: ApiPermissionAssignments;
    configs: Configs;
  };
}

export const botControlCmd = globalPluginMessageCommand<BotControlPluginType>();
export const botControlEvt = globalPluginEventListener<BotControlPluginType>();
