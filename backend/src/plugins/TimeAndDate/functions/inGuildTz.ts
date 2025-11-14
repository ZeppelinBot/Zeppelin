import { GuildPluginData } from "vety";
import moment from "moment-timezone";
import { TimeAndDatePluginType } from "../types.js";
import { getGuildTz } from "./getGuildTz.js";

export function inGuildTz(pluginData: GuildPluginData<TimeAndDatePluginType>, input?: moment.Moment | number) {
  let momentObj: moment.Moment;
  if (typeof input === "number") {
    momentObj = moment.utc(input, "x");
  } else if (moment.isMoment(input)) {
    momentObj = input.clone();
  } else {
    momentObj = moment.utc();
  }

  return momentObj.tz(getGuildTz(pluginData));
}
