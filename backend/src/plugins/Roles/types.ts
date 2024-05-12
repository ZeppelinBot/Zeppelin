import { BasePluginType, guildPluginMessageCommand, pluginUtils } from "knub";
import z from "zod";
import { GuildLogs } from "../../data/GuildLogs";
import { CommonPlugin } from "../Common/CommonPlugin";

export const zRolesConfig = z.strictObject({
  can_assign: z.boolean(),
  can_mass_assign: z.boolean(),
  assignable_roles: z.array(z.string()).max(100),
});

export interface RolesPluginType extends BasePluginType {
  config: z.infer<typeof zRolesConfig>;
  state: {
    logs: GuildLogs;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const rolesCmd = guildPluginMessageCommand<RolesPluginType>();
