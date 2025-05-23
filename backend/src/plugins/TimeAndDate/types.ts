import { BasePluginType, guildPluginMessageCommand, pluginUtils } from "knub";
import { U } from "ts-toolbelt";
import z from "zod/v4";
import { GuildMemberTimezones } from "../../data/GuildMemberTimezones.js";
import { keys } from "../../utils.js";
import { zValidTimezone } from "../../utils/zValidTimezone.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { defaultDateFormats } from "./defaultDateFormats.js";

const zDateFormatKeys = z.enum(keys(defaultDateFormats) as U.ListOf<keyof typeof defaultDateFormats>);

export const zTimeAndDateConfig = z.strictObject({
  timezone: zValidTimezone(z.string()).default("Etc/UTC"),
  date_formats: z.record(zDateFormatKeys, z.string()).nullable().default(defaultDateFormats),
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
