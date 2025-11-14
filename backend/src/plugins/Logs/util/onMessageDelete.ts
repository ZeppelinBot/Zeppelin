import { Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { resolveUser } from "../../../utils.js";
import { logMessageDelete } from "../logFunctions/logMessageDelete.js";
import { logMessageDeleteBare } from "../logFunctions/logMessageDeleteBare.js";
import { LogsPluginType } from "../types.js";
import { isLogIgnored } from "./isLogIgnored.js";

export async function onMessageDelete(pluginData: GuildPluginData<LogsPluginType>, savedMessage: SavedMessage) {
  const user = await resolveUser(pluginData.client, savedMessage.user_id, "Logs:onMessageDelete");
  const channel = pluginData.guild.channels.resolve(savedMessage.channel_id as Snowflake);

  if (!channel?.isTextBased()) {
    return;
  }

  if (isLogIgnored(pluginData, LogType.MESSAGE_DELETE, savedMessage.id)) {
    return;
  }

  if (user) {
    logMessageDelete(pluginData, {
      user,
      channel,
      message: savedMessage,
    });
  } else {
    logMessageDeleteBare(pluginData, {
      messageId: savedMessage.id,
      channel,
    });
  }
}
