import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "knub";
import z from "zod";
import { GuildPingableRoles } from "../../data/GuildPingableRoles";
import { PingableRole } from "../../data/entities/PingableRole";
import { CommonPlugin } from "../Common/CommonPlugin";

export const zPingableRolesConfig = z.strictObject({
  can_manage: z.boolean(),
});

export interface PingableRolesPluginType extends BasePluginType {
  config: z.infer<typeof zPingableRolesConfig>;

  state: {
    pingableRoles: GuildPingableRoles;
    cache: Map<string, PingableRole[]>;
    timeouts: Map<string, any>;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const pingableRolesCmd = guildPluginMessageCommand<PingableRolesPluginType>();
export const pingableRolesEvt = guildPluginEventListener<PingableRolesPluginType>();
