import { GuildPluginData } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { runAutomod } from "../functions/runAutomod";

export function runAutomodOnCounterTrigger(
  pluginData: GuildPluginData<AutomodPluginType>,
  counterName: string,
  condition: string,
  channelId: string | null,
  userId: string | null,
  reverse: boolean,
) {
  const context: AutomodContext = {
    timestamp: Date.now(),
    counterTrigger: {
      name: counterName,
      condition,
      channelId,
      userId,
      reverse,
    },
  };

  pluginData.state.queue.add(async () => {
    await runAutomod(pluginData, context);
  });
}
