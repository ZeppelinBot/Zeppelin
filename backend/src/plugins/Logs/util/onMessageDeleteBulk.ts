import { Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { getBaseUrl } from "../../../pluginUtils.js";
import { logMessageDeleteBulk } from "../logFunctions/logMessageDeleteBulk.js";
import { LogsPluginType } from "../types.js";
import { isLogIgnored } from "./isLogIgnored.js";

export async function onMessageDeleteBulk(pluginData: GuildPluginData<LogsPluginType>, savedMessages: SavedMessage[]) {
  if (isLogIgnored(pluginData, LogType.MESSAGE_DELETE, savedMessages[0].id)) {
    return;
  }

  const channel = pluginData.guild.channels.cache.get(savedMessages[0].channel_id as Snowflake);
  if (!channel?.isTextBased()) {
    return;
  }

  const archiveId = await pluginData.state.archives.createFromSavedMessages(savedMessages, pluginData.guild);
  const archiveUrl = pluginData.state.archives.getUrl(getBaseUrl(pluginData), archiveId);
  const authorIds = Array.from(new Set(savedMessages.map((item) => `\`${item.user_id}\``)));

  logMessageDeleteBulk(pluginData, {
    count: savedMessages.length,
    authorIds,
    channel,
    archiveUrl,
  });
}
