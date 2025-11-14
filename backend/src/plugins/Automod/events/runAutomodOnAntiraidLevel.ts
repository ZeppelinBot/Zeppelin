import { User } from "discord.js";
import { GuildPluginData } from "vety";
import { runAutomod } from "../functions/runAutomod.js";
import { AutomodContext, AutomodPluginType } from "../types.js";

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
