import moment from "moment-timezone";
import { PluginData } from "knub";
import { ZeppelinGuildConfig } from "../types";

export function getGuildTz(pluginData: PluginData<any>) {
  const guildConfig = pluginData.guildConfig as ZeppelinGuildConfig;
  return guildConfig.timezone || "Etc/UTC";
}

export function inGuildTz(pluginData: PluginData<any>, input?: moment.Moment | number) {
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
