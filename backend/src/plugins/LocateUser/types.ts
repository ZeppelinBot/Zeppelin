import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { GuildVCAlerts } from "../../data/GuildVCAlerts.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zLocateUserConfig = z.strictObject({
  can_where: z.boolean().default(false),
  can_alert: z.boolean().default(false),
});

export interface LocateUserPluginType extends BasePluginType {
  configSchema: typeof zLocateUserConfig;
  state: {
    alerts: GuildVCAlerts;
    usersWithAlerts: string[];
    unregisterGuildEventListener: () => void;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const locateUserCmd = guildPluginMessageCommand<LocateUserPluginType>();
export const locateUserEvt = guildPluginEventListener<LocateUserPluginType>();
