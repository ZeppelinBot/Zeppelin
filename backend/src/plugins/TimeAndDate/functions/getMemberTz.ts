import { PluginData } from "knub";
import { TimeAndDatePluginType } from "../types";
import { getGuildTz } from "./getGuildTz";

export async function getMemberTz(pluginData: PluginData<TimeAndDatePluginType>, memberId: string) {
  const memberTz = await pluginData.state.memberTimezones.get(memberId);
  return memberTz?.timezone || getGuildTz(pluginData);
}
