import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { GuildPingableRoles } from "../../data/GuildPingableRoles.js";
import { PingableRole } from "../../data/entities/PingableRole.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zPingableRolesConfig = z.strictObject({
  can_manage: z.boolean().default(false),
});

export interface PingableRolesPluginType extends BasePluginType {
  configSchema: typeof zPingableRolesConfig;
  state: {
    pingableRoles: GuildPingableRoles;
    cache: Map<string, PingableRole[]>;
    timeouts: Map<string, any>;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const pingableRolesCmd = guildPluginMessageCommand<PingableRolesPluginType>();
export const pingableRolesEvt = guildPluginEventListener<PingableRolesPluginType>();
