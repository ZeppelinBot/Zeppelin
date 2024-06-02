import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { performance } from "perf_hooks";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { profilingEnabled } from "../../../utils/easyProfiler.js";
import { addRecentActionsFromMessage } from "../functions/addRecentActionsFromMessage.js";
import { clearRecentActionsForMessage } from "../functions/clearRecentActionsForMessage.js";
import { runAutomod } from "../functions/runAutomod.js";
import { AutomodContext, AutomodPluginType } from "../types.js";

export async function runAutomodOnMessage(
  pluginData: GuildPluginData<AutomodPluginType>,
  message: SavedMessage,
  isEdit: boolean,
) {
  const member = pluginData.guild.members.resolve(message.user_id) ?? undefined;
  const user = pluginData.client.users.resolve(message.user_id) ?? undefined;

  const context: AutomodContext = {
    timestamp: moment.utc(message.posted_at).valueOf(),
    message,
    user,
    member,
  };

  pluginData.state.queue.add(async () => {
    const startTime = performance.now();

    if (isEdit) {
      clearRecentActionsForMessage(pluginData, context);
    }

    addRecentActionsFromMessage(pluginData, context);

    await runAutomod(pluginData, context);

    if (profilingEnabled()) {
      pluginData
        .getKnubInstance()
        .profiler.addDataPoint(`automod:${pluginData.guild.id}`, performance.now() - startTime);
    }
  });
}
