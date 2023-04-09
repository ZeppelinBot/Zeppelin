import { Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { resolveUser } from "../../../utils";
import { logMessageDelete } from "../logFunctions/logMessageDelete";
import { logMessageDeleteBare } from "../logFunctions/logMessageDeleteBare";
import { LogsPluginType } from "../types";
import { isLogIgnored } from "./isLogIgnored";

export async function onMessageDelete(pluginData: GuildPluginData<LogsPluginType>, savedMessage: SavedMessage) {
  const user = await resolveUser(pluginData.client, savedMessage.user_id);
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
