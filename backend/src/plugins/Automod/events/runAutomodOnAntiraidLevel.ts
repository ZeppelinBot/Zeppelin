import { GuildPluginData } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { runAutomod } from "../functions/runAutomod";

export async function runAutomodOnAntiraidLevel(pluginData: GuildPluginData<AutomodPluginType>, level: string | null) {
  const context: AutomodContext = {
    timestamp: Date.now(),
    antiraid: {
      level,
    },
  };

  pluginData.state.queue.add(async () => {
    await runAutomod(pluginData, context);
  });
}
