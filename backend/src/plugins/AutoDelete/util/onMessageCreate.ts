import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { convertDelayStringToMS, resolveMember } from "../../../utils";
import { AutoDeletePluginType, MAX_DELAY } from "../types";
import { addMessageToDeletionQueue } from "./addMessageToDeletionQueue";

export async function onMessageCreate(pluginData: GuildPluginData<AutoDeletePluginType>, msg: SavedMessage) {
  const member = await resolveMember(pluginData.client, pluginData.guild, msg.user_id);
  const config = await pluginData.config.getMatchingConfig({ member, channelId: msg.channel_id });
  if (config.enabled) {
    let delay = convertDelayStringToMS(config.delay)!;

    if (delay > MAX_DELAY) {
      delay = MAX_DELAY;
      if (!pluginData.state.maxDelayWarningSent) {
        pluginData.state.guildLogs.log(LogType.BOT_ALERT, {
          body: `Clamped auto-deletion delay in <#${msg.channel_id}> to 5 minutes`,
        });
        pluginData.state.maxDelayWarningSent = true;
      }
    }

    addMessageToDeletionQueue(pluginData, msg, delay);
  }
}
