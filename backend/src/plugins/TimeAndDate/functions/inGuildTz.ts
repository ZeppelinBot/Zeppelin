import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { TimeAndDatePluginType } from "../types";
import { getGuildTz } from "./getGuildTz";

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
