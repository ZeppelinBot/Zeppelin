import { GuildPluginData } from "vety";
import { SECONDS } from "../../../utils.js";
import { IgnoredEventType, ModActionsPluginType } from "../types.js";
import { clearIgnoredEvents } from "./clearIgnoredEvents.js";

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
