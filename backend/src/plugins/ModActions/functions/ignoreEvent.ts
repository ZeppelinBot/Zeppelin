import { GuildPluginData } from "knub";
import { SECONDS } from "../../../utils";
import { IgnoredEventType, ModActionsPluginType } from "../types";
import { clearIgnoredEvents } from "./clearIgnoredEvents";

const DEFAULT_TIMEOUT = 15 * SECONDS;

export function ignoreEvent(
  pluginData: GuildPluginData<ModActionsPluginType>,
  type: IgnoredEventType,
  userId: string,
  timeout = DEFAULT_TIMEOUT,
) {
  pluginData.state.ignoredEvents.push({ type, userId });

  // Clear after expiry (15sec by default)
  setTimeout(() => {
    clearIgnoredEvents(pluginData, type, userId);
  }, timeout);
}
