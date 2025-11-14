import { GuildPluginData } from "vety";
import { TimeAndDatePluginType } from "../types.js";
import { getGuildTz } from "./getGuildTz.js";

export async function getMemberTz(pluginData: GuildPluginData<TimeAndDatePluginType>, memberId: string) {
  const memberTz = await pluginData.state.memberTimezones.get(memberId);
  return memberTz?.timezone || getGuildTz(pluginData);
}
