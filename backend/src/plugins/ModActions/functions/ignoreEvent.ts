import { PluginData } from "knub";
import { IgnoredEventType, ModActionsPluginType } from "../types";
import { SECONDS } from "../../../utils";
import { clearIgnoredEvent } from "./clearIgnoredEvents";

const DEFAULT_TIMEOUT = 15 * SECONDS;

export function ignoreEvent(
  pluginData: PluginData<ModActionsPluginType>,
  type: IgnoredEventType,
  userId: string,
  timeout = DEFAULT_TIMEOUT,
) {
  pluginData.state.ignoredEvents.push({ type, userId });

  // Clear after expiry (15sec by default)
  setTimeout(() => {
    clearIgnoredEvent(pluginData, type, userId);
  }, timeout);
}
