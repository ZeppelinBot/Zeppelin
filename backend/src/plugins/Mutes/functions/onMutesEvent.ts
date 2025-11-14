import { GuildPluginData } from "vety";
import { MutesEvents, MutesPluginType } from "../types.js";

export function onMutesEvent<TEvent extends keyof MutesEvents>(
  pluginData: GuildPluginData<MutesPluginType>,
  event: TEvent,
  listener: MutesEvents[TEvent],
) {
  return pluginData.state.events.on(event, listener);
}
