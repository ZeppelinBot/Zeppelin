import { GuildPluginData } from "vety";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { convertDelayStringToMS, resolveMember } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { AutoDeletePluginType, MAX_DELAY } from "../types.js";
import { addMessageToDeletionQueue } from "./addMessageToDeletionQueue.js";

export async function onMessageCreate(pluginData: GuildPluginData<AutoDeletePluginType>, msg: SavedMessage) {
  const member = await resolveMember(pluginData.client, pluginData.guild, msg.user_id);
  const config = await pluginData.config.getMatchingConfig({ member, channelId: msg.channel_id });
  if (config.enabled) {
    let delay = convertDelayStringToMS(config.delay)!;

    if (delay > MAX_DELAY) {
      delay = MAX_DELAY;
      if (!pluginData.state.maxDelayWarningSent) {
        pluginData.getPlugin(LogsPlugin).logBotAlert({
          body: `Clamped auto-deletion delay in <#${msg.channel_id}> to 5 minutes`,
        });
        pluginData.state.maxDelayWarningSent = true;
      }
    }

    addMessageToDeletionQueue(pluginData, msg, delay);
  }
}
