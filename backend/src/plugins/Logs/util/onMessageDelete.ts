import { BaseGuildTextChannel, Snowflake, ThreadChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { resolveUser } from "../../../utils";
import { LogsPluginType } from "../types";
import { logMessageDelete } from "../logFunctions/logMessageDelete";
import { isLogIgnored } from "./isLogIgnored";
import { logMessageDeleteBare } from "../logFunctions/logMessageDeleteBare";

export async function onMessageDelete(pluginData: GuildPluginData<LogsPluginType>, savedMessage: SavedMessage) {
  const user = await resolveUser(pluginData.client, savedMessage.user_id);
  const channel = pluginData.guild.channels.resolve(savedMessage.channel_id as Snowflake)! as
    | BaseGuildTextChannel
    | ThreadChannel;

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
