import { GuildPluginData } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { runAutomod } from "../functions/runAutomod";
import { User } from "eris";

export async function runAutomodOnAntiraidLevel(
  pluginData: GuildPluginData<AutomodPluginType>,
  level: string | null,
  user?: User,
) {
  const context: AutomodContext = {
    timestamp: Date.now(),
    antiraid: {
      level,
    },
    user,
  };

  pluginData.state.queue.add(async () => {
    await runAutomod(pluginData, context);
  });
}
