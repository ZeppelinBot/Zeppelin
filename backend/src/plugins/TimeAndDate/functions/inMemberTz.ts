import { PluginData } from "knub";
import { TimeAndDatePluginType } from "../types";
import moment from "moment-timezone";
import { getGuildTz } from "./getGuildTz";
import { getMemberTz } from "./getMemberTz";

export async function inMemberTz(
  pluginData: PluginData<TimeAndDatePluginType>,
  memberId: string,
  input?: moment.Moment | number,
) {
  let momentObj: moment.Moment;
  if (typeof input === "number") {
    momentObj = moment.utc(input, "x");
  } else if (moment.isMoment(input)) {
    momentObj = input.clone();
  } else {
    momentObj = moment.utc();
  }

  return momentObj.tz(await getMemberTz(pluginData, memberId));
}
