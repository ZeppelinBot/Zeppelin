import { GuildPluginData } from "knub";
import { ModActionsEvents, ModActionsPluginType } from "../types";

export function offModActionsEvent<TEvent extends keyof ModActionsEvents>(
  pluginData: GuildPluginData<ModActionsPluginType>,
  event: TEvent,
  listener: ModActionsEvents[TEvent],
) {
  return pluginData.state.events.off(event, listener);
}
