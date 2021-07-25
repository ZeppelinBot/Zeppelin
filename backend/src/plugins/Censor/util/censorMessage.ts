import { Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { deactivateMentions, disableCodeBlocks } from "knub/dist/helpers";
import { channelToConfigAccessibleChannel, userToConfigAccessibleUser } from "../../../utils/configAccessibleObjects";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { resolveUser } from "../../../utils";
import { CensorPluginType } from "../types";

export async function censorMessage(
  pluginData: GuildPluginData<CensorPluginType>,
  savedMessage: SavedMessage,
  reason: string,
) {
  pluginData.state.serverLogs.ignoreLog(LogType.MESSAGE_DELETE, savedMessage.id);

  try {
    const resolvedChannel = pluginData.guild.channels.resolve(savedMessage.channel_id as Snowflake) as TextChannel;
    await resolvedChannel.messages.delete(savedMessage.id as Snowflake);
  } catch {
    return;
  }

  const user = await resolveUser(pluginData.client, savedMessage.user_id);
  const channel = pluginData.guild.channels.resolve(savedMessage.channel_id as Snowflake)!;

  pluginData.state.serverLogs.log(LogType.CENSOR, {
    user: userToConfigAccessibleUser(user),
    channel: channelToConfigAccessibleChannel(channel),
    reason,
    message: savedMessage,
    messageText: disableCodeBlocks(deactivateMentions(savedMessage.data.content)),
  });
}
