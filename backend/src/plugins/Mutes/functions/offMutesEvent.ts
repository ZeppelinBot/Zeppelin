import { GuildPluginData } from "knub";
import { MutesEvents, MutesPluginType } from "../types";

export function offMutesEvent<TEvent extends keyof MutesEvents>(
  pluginData: GuildPluginData<MutesPluginType>,
  event: TEvent,
  listener: MutesEvents[TEvent],
) {
  return pluginData.state.events.off(event, listener);
}
