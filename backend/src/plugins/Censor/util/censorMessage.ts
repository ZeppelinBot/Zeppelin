import { GuildPluginData } from "knub";
import { CensorPluginType } from "../types";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars, resolveUser } from "../../../utils";
import { disableCodeBlocks, deactivateMentions } from "knub/dist/helpers";
import { TextChannel } from "discord.js";

export async function censorMessage(
  pluginData: GuildPluginData<CensorPluginType>,
  savedMessage: SavedMessage,
  reason: string,
) {
  pluginData.state.serverLogs.ignoreLog(LogType.MESSAGE_DELETE, savedMessage.id);

  try {
    const resolvedChannel = pluginData.guild.channels.resolve(savedMessage.channel_id) as TextChannel;
    await resolvedChannel.messages.delete(savedMessage.id);
  } catch {
    return;
  }

  const user = await resolveUser(pluginData.client, savedMessage.user_id);
  const channel = pluginData.guild.channels.cache.get(savedMessage.channel_id);

  pluginData.state.serverLogs.log(LogType.CENSOR, {
    user: stripObjectToScalars(user),
    channel: stripObjectToScalars(channel),
    reason,
    message: savedMessage,
    messageText: disableCodeBlocks(deactivateMentions(savedMessage.data.content)),
  });
}
