import { GuildPluginData } from "knub";
import { CensorPluginType } from "../types";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars, resolveUser } from "../../../utils";
import { disableCodeBlocks, deactivateMentions } from "knub/dist/helpers";

export async function censorMessage(
  pluginData: GuildPluginData<CensorPluginType>,
  savedMessage: SavedMessage,
  reason: string,
) {
  pluginData.state.serverLogs.ignoreLog(LogType.MESSAGE_DELETE, savedMessage.id);

  try {
    await pluginData.client.deleteMessage(savedMessage.channel_id, savedMessage.id, "Censored");
  } catch {
    return;
  }

  const user = await resolveUser(pluginData.client, savedMessage.user_id);
  const channel = pluginData.guild.channels.get(savedMessage.channel_id);

  pluginData.state.serverLogs.log(LogType.CENSOR, {
    user: stripObjectToScalars(user),
    channel: stripObjectToScalars(channel),
    reason,
    message: savedMessage,
    messageText: disableCodeBlocks(deactivateMentions(savedMessage.data.content)),
  });
}
