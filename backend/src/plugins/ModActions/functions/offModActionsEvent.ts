import { GuildPluginData } from "vety";
import { ModActionsEvents, ModActionsPluginType } from "../types.js";

export function offModActionsEvent<TEvent extends keyof ModActionsEvents>(
  pluginData: GuildPluginData<ModActionsPluginType>,
  event: TEvent,
  listener: ModActionsEvents[TEvent],
) {
  return pluginData.state.events.off(event, listener);
}
