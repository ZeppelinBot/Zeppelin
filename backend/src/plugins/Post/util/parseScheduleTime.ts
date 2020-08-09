import moment, { Moment } from "moment-timezone";
import { convertDelayStringToMS } from "src/utils";
import { PluginData } from "knub";
import { getGuildTz } from "../../../utils/timezones";

// TODO: Extract out of the Post plugin, use everywhere with a date input
export function parseScheduleTime(pluginData: PluginData<any>, str: string): Moment {
  const tz = getGuildTz(pluginData);

  const dt1 = moment.tz(str, "YYYY-MM-DD HH:mm:ss", tz);
  if (dt1 && dt1.isValid()) return dt1;

  const dt2 = moment.tz(str, "YYYY-MM-DD HH:mm", tz);
  if (dt2 && dt2.isValid()) return dt2;

  const date = moment.tz(str, "YYYY-MM-DD", tz);
  if (date && date.isValid()) return date;

  const t1 = moment.tz(str, "HH:mm:ss", tz);
  if (t1 && t1.isValid()) {
    if (t1.isBefore(moment.utc())) t1.add(1, "day");
    return t1;
  }

  const t2 = moment.tz(str, "HH:mm", tz);
  if (t2 && t2.isValid()) {
    if (t2.isBefore(moment.utc())) t2.add(1, "day");
    return t2;
  }

  const delayStringMS = convertDelayStringToMS(str, "m");
  if (delayStringMS) {
    return moment.tz(tz).add(delayStringMS, "ms");
  }

  return null;
}
