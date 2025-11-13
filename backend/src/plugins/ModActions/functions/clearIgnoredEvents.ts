import { GuildPluginData } from "vety";
import { IgnoredEventType, ModActionsPluginType } from "../types.js";

export function clearIgnoredEvents(
  pluginData: GuildPluginData<ModActionsPluginType>,
  type: IgnoredEventType,
  userId: string,
) {
  pluginData.state.ignoredEvents.splice(
    pluginData.state.ignoredEvents.findIndex((info) => type === info.type && userId === info.userId),
    1,
  );
}
