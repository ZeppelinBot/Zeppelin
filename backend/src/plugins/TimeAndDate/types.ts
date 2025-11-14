import { BasePluginType, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { GuildMemberTimezones } from "../../data/GuildMemberTimezones.js";
import { keys } from "../../utils.js";
import { zValidTimezone } from "../../utils/zValidTimezone.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { defaultDateFormats } from "./defaultDateFormats.js";

const dateFormatTypeMap = keys(defaultDateFormats).reduce(
  (map, key) => {
    map[key] = z.string().default(defaultDateFormats[key]);
    return map;
  },
  {} as Record<keyof typeof defaultDateFormats, z.ZodDefault<z.ZodString>>,
);

export const zTimeAndDateConfig = z.strictObject({
  timezone: zValidTimezone(z.string()).default("Etc/UTC"),
  date_formats: z.strictObject(dateFormatTypeMap).default(defaultDateFormats),
  can_set_timezone: z.boolean().default(false),
});

export interface TimeAndDatePluginType extends BasePluginType {
  configSchema: typeof zTimeAndDateConfig;
  state: {
    memberTimezones: GuildMemberTimezones;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const timeAndDateCmd = guildPluginMessageCommand<TimeAndDatePluginType>();
