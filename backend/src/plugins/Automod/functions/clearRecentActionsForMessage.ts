import { GuildPluginData } from "knub";
import { startProfiling } from "../../../utils/easyProfiler.js";
import { AutomodContext, AutomodPluginType } from "../types.js";

export function clearRecentActionsForMessage(pluginData: GuildPluginData<AutomodPluginType>, context: AutomodContext) {
  const stopProfiling = startProfiling(
    pluginData.getKnubInstance().profiler,
    "automod:fns:clearRecentActionsForMessage",
  );
  const message = context.message!;
  const globalIdentifier = message.user_id;
  const perChannelIdentifier = `${message.channel_id}-${message.user_id}`;

  pluginData.state.recentActions = pluginData.state.recentActions.filter((act) => {
    return act.identifier !== globalIdentifier && act.identifier !== perChannelIdentifier;
  });
  stopProfiling();
}
