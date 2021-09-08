import { GuildPluginData } from "knub";
import { IgnoredEventType, ModActionsPluginType } from "../types";

export function isEventIgnored(
  pluginData: GuildPluginData<ModActionsPluginType>,
  type: IgnoredEventType,
  userId: string,
) {
  return pluginData.state.ignoredEvents.some((info) => type === info.type && userId === info.userId);
}
