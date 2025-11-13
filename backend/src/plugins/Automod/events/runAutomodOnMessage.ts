import { GuildPluginData } from "vety";
import moment from "moment-timezone";
import { performance } from "perf_hooks";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { profilingEnabled } from "../../../utils/easyProfiler.js";
import { addRecentActionsFromMessage } from "../functions/addRecentActionsFromMessage.js";
import { clearRecentActionsForMessage } from "../functions/clearRecentActionsForMessage.js";
import { runAutomod } from "../functions/runAutomod.js";
import { AutomodContext, AutomodPluginType } from "../types.js";
import { getOrFetchGuildMember } from "../../../utils/getOrFetchGuildMember.js";
import { getOrFetchUser } from "../../../utils/getOrFetchUser.js";
import { incrementDebugCounter } from "../../../debugCounters.js";

export async function runAutomodOnMessage(
  pluginData: GuildPluginData<AutomodPluginType>,
  message: SavedMessage,
  isEdit: boolean,
) {
  incrementDebugCounter("automod:runAutomodOnMessage");
  
  const member = await getOrFetchGuildMember(pluginData.guild, message.user_id);
  const user = await getOrFetchUser(pluginData.client, message.user_id);

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
        .getVetyInstance()
        .profiler.addDataPoint(`automod:${pluginData.guild.id}`, performance.now() - startTime);
    }
  });
}
