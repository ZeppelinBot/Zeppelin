import { Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { addRecentActionsFromMessage } from "../functions/addRecentActionsFromMessage";
import { clearRecentActionsForMessage } from "../functions/clearRecentActionsForMessage";
import { runAutomod } from "../functions/runAutomod";
import { AutomodContext, AutomodPluginType } from "../types";
import { performance } from "perf_hooks";

export function runAutomodOnMessage(
  pluginData: GuildPluginData<AutomodPluginType>,
  message: SavedMessage,
  isEdit: boolean,
) {
  const user = pluginData.client.users.cache.get(message.user_id as Snowflake);
  const member = pluginData.guild.members.cache.get(message.user_id as Snowflake);

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

    pluginData.getKnubInstance().profiler.addDataPoint(`automod:${pluginData.guild.id}`, performance.now() - startTime);
  });
}
