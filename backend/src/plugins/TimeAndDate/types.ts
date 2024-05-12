import { BasePluginType, guildPluginMessageCommand, pluginUtils } from "knub";
import { U } from "ts-toolbelt";
import z from "zod";
import { GuildMemberTimezones } from "../../data/GuildMemberTimezones";
import { keys } from "../../utils";
import { zValidTimezone } from "../../utils/zValidTimezone";
import { CommonPlugin } from "../Common/CommonPlugin";
import { defaultDateFormats } from "./defaultDateFormats";

const zDateFormatKeys = z.enum(keys(defaultDateFormats) as U.ListOf<keyof typeof defaultDateFormats>);

export const zTimeAndDateConfig = z.strictObject({
  timezone: zValidTimezone(z.string()),
  date_formats: z.record(zDateFormatKeys, z.string()).nullable(),
  can_set_timezone: z.boolean(),
});

export interface TimeAndDatePluginType extends BasePluginType {
  config: z.infer<typeof zTimeAndDateConfig>;
  state: {
    memberTimezones: GuildMemberTimezones;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const timeAndDateCmd = guildPluginMessageCommand<TimeAndDatePluginType>();
