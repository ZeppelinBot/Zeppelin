import { PluginData } from "knub";
import { IgnoredEventType, ModActionsPluginType } from "../types";

export function isEventIgnored(pluginData: PluginData<ModActionsPluginType>, type: IgnoredEventType, userId: string) {
  return pluginData.state.ignoredEvents.some(info => type === info.type && userId === info.userId);
}
