import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { runAutomod } from "../functions/runAutomod";
import { AutomodContext, AutomodPluginType } from "../types";

export async function runAutomodOnAntiraidLevel(
  pluginData: GuildPluginData<AutomodPluginType>,
  newLevel: string | null,
  oldLevel: string | null,
  user?: User,
) {
  const context: AutomodContext = {
    timestamp: Date.now(),
    antiraid: {
      level: newLevel,
      oldLevel,
    },
    user,
  };

  pluginData.state.queue.add(async () => {
    await runAutomod(pluginData, context);
  });
}
