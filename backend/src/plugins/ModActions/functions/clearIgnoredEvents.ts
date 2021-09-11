import { GuildPluginData } from "knub";
import { IgnoredEventType, ModActionsPluginType } from "../types";

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
