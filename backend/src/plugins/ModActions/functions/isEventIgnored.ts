import { GuildPluginData } from "vety";
import { IgnoredEventType, ModActionsPluginType } from "../types.js";

export function isEventIgnored(
  pluginData: GuildPluginData<ModActionsPluginType>,
  type: IgnoredEventType,
  userId: string,
) {
  return pluginData.state.ignoredEvents.some((info) => type === info.type && userId === info.userId);
}
