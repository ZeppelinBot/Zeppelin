import { GuildTextBasedChannel, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { resolveUser } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { CensorPluginType } from "../types";

export async function censorMessage(
  pluginData: GuildPluginData<CensorPluginType>,
  savedMessage: SavedMessage,
  reason: string,
) {
  pluginData.state.serverLogs.ignoreLog(LogType.MESSAGE_DELETE, savedMessage.id);

  try {
    const resolvedChannel = pluginData.guild.channels.resolve(savedMessage.channel_id as Snowflake);
    if (resolvedChannel?.isTextBased()) await resolvedChannel.messages.delete(savedMessage.id as Snowflake);
  } catch {
    return;
  }

  const user = await resolveUser(pluginData.client, savedMessage.user_id);
  const channel = pluginData.guild.channels.resolve(savedMessage.channel_id as Snowflake)! as GuildTextBasedChannel;

  pluginData.getPlugin(LogsPlugin).logCensor({
    user,
    channel,
    reason,
    message: savedMessage,
  });
}
