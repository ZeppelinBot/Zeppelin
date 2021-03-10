import { GuildPluginData } from "knub";
import { ModActionsEvents, ModActionsPluginType } from "../types";

export function onModActionsEvent<TEvent extends keyof ModActionsEvents>(
  pluginData: GuildPluginData<ModActionsPluginType>,
  event: TEvent,
  listener: ModActionsEvents[TEvent],
) {
  return pluginData.state.events.on(event, listener);
}
